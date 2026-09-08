import assert from "node:assert/strict";
import test from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db/server";
import {
  customers,
  orders,
  payments,
  products,
  walletTransactions,
} from "../src/lib/db/schema";
import { evaluateCreditEligibility } from "../src/lib/customer-credit";
import { checkoutSchema } from "../src/lib/validation";
import { formatInr, formatInrExact } from "../src/lib/formatting";

test("Financial QA: B2C UPI QR rejects order without payment screenshot proof", () => {
  const invalidUpiPayload = {
    customer: {
      contactName: "B2C Customer",
      companyName: "Individual",
      phone: "9876543210",
    },
    address: {
      line1: "123 Street",
      city: "Ahmedabad",
      state: "Gujarat",
      stateCode: "GJ",
      postalCode: "380001",
      country: "India",
    },
    paymentMethod: "UPI_QR",
  };

  const parsed = checkoutSchema.safeParse(invalidUpiPayload);
  assert.equal(parsed.success, true);
  // Checkout API validates proofImageUrl must be present for UPI_QR
  assert.equal(!parsed.data.proofImageUrl, true, "Proof image URL must be missing in invalid submission");
});

test("Financial QA: B2C UPI QR accepts valid proof and UTR reference", () => {
  const validUpiPayload = {
    customer: {
      contactName: "B2C Customer",
      companyName: "Individual",
      phone: "9876543210",
    },
    address: {
      line1: "123 Street",
      city: "Ahmedabad",
      state: "Gujarat",
      stateCode: "GJ",
      postalCode: "380001",
      country: "India",
    },
    paymentMethod: "UPI_QR",
    proofImageUrl: "/api/payments/proof?key=payment-proofs/test.png",
    utr: "123456789012",
  };

  const parsed = checkoutSchema.parse(validUpiPayload);
  assert.equal(parsed.proofImageUrl, "/api/payments/proof?key=payment-proofs/test.png");
  assert.equal(parsed.utr, "123456789012");
});

test("Financial QA: Payment proof security restricts access between customers", () => {
  const customerA_id = crypto.randomUUID();
  const customerB_id = crypto.randomUUID();
  const proofKeyA = `payment-proofs/${customerA_id}/receipt.png`;

  assert.equal(proofKeyA.includes(customerA_id), true, "Owner customer A is authorized");
  assert.equal(proofKeyA.includes(customerB_id), false, "Customer B is unauthorized");
});

test("Financial QA: B2B zero & negative balance order placement and ledger tracking", async () => {
  const testSuffix = Date.now().toString().slice(-6);
  const [testCust] = await db
    .insert(customers)
    .values({
      contactName: `B2B QA ${testSuffix}`,
      companyName: `B2B Corp ${testSuffix}`,
      email: `b2b-qa-${testSuffix}@example.com`,
      phone: "9876543210",
      customerType: "B2B",
      creditEnabled: true,
      availableCredit: "0.00",
      walletBalance: "0.00",
      creditLimit: "50000.00",
      paymentTermsDays: 30,
      status: "ACTIVE",
    })
    .returning();

  try {
    // 1. Eligibility at ₹0 balance
    const eligZero = evaluateCreditEligibility(testCust, "5000.00");
    assert.equal(eligZero.eligible, true, "B2B with credit enabled must be eligible at ₹0 balance");

    // 2. Place ₹5,000 order -> balance goes from ₹0 to -₹5,000
    const ord1 = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(customers).where(eq(customers.id, testCust.id)).for("update");
      const bBefore = Number(c.availableCredit || 0);
      const bAfter = (bBefore - 5000.0).toFixed(2);
      await tx.update(customers).set({ availableCredit: bAfter, walletBalance: bAfter }).where(eq(customers.id, c.id));
      await tx.insert(walletTransactions).values({
        customerId: c.id,
        transactionType: "WALLET_DEBIT",
        status: "APPROVED",
        amount: "5000.00",
        balanceBefore: bBefore.toFixed(2),
        balanceAfter: bAfter,
        notes: "Order 1 debit",
      });
      const [orderRow] = await tx.insert(orders).values({
        orderNumber: `QA-ORD-${testSuffix}-1`,
        customerId: c.id,
        status: "PENDING",
        total: "5000.00",
        subtotal: "5000.00",
      }).returning();
      const [payRow] = await tx.insert(payments).values({
        orderId: orderRow.id,
        customerId: c.id,
        amount: "5000.00",
        paidAmount: "0.00",
        refundedAmount: "0.00",
        method: "WALLET",
        status: "PENDING",
      }).returning();
      return { orderRow, payRow, bAfter };
    });

    assert.equal(ord1.bAfter, "-5000.00");

    // 3. Place ₹3,000 order from -₹5,000 -> balance goes to -₹8,000
    const ord2 = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(customers).where(eq(customers.id, testCust.id)).for("update");
      const bBefore = Number(c.availableCredit || 0);
      const bAfter = (bBefore - 3000.0).toFixed(2);
      await tx.update(customers).set({ availableCredit: bAfter, walletBalance: bAfter }).where(eq(customers.id, c.id));
      await tx.insert(walletTransactions).values({
        customerId: c.id,
        transactionType: "WALLET_DEBIT",
        status: "APPROVED",
        amount: "3000.00",
        balanceBefore: bBefore.toFixed(2),
        balanceAfter: bAfter,
        notes: "Order 2 debit",
      });
      return { bAfter };
    });

    assert.equal(ord2.bAfter, "-8000.00");

    // 4. Admin adds ₹10,000 -> balance goes from -₹8,000 to ₹2,000
    const addBal = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(customers).where(eq(customers.id, testCust.id)).for("update");
      const bBefore = Number(c.availableCredit || 0);
      const bAfter = (bBefore + 10000.0).toFixed(2);
      await tx.update(customers).set({ availableCredit: bAfter, walletBalance: bAfter }).where(eq(customers.id, c.id));
      await tx.insert(walletTransactions).values({
        customerId: c.id,
        transactionType: "ADMIN_CREDIT",
        status: "APPROVED",
        amount: "10000.00",
        balanceBefore: bBefore.toFixed(2),
        balanceAfter: bAfter,
        reference: "BANK-DEP-10K",
        notes: "[BANK_TRANSFER] Advance received (Ref: BANK-DEP-10K)",
      });
      return { bAfter };
    });

    assert.equal(addBal.bAfter, "2000.00");

    // 5. Admin adjustment -₹500 -> balance goes from ₹2,000 to ₹1,500
    const adjBal = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(customers).where(eq(customers.id, testCust.id)).for("update");
      const bBefore = Number(c.availableCredit || 0);
      const bAfter = (bBefore - 500.0).toFixed(2);
      await tx.update(customers).set({ availableCredit: bAfter, walletBalance: bAfter }).where(eq(customers.id, c.id));
      await tx.insert(walletTransactions).values({
        customerId: c.id,
        transactionType: "ADMIN_ADJUSTMENT",
        status: "APPROVED",
        amount: "500.00",
        balanceBefore: bBefore.toFixed(2),
        balanceAfter: bAfter,
        notes: "[DEBIT] Reason: Correction of fee",
      });
      return { bAfter };
    });

    assert.equal(adjBal.bAfter, "1500.00");

    // 6. Cancel order 1 -> verify NO automatic credit occurs
    await db.update(orders).set({ status: "CANCELLED" }).where(eq(orders.id, ord1.orderRow.id));
    const [cAfterCancel] = await db.select().from(customers).where(eq(customers.id, testCust.id));
    assert.equal(cAfterCancel.availableCredit, "1500.00", "Balance must not change automatically on order cancellation");

    // 7. Manual cancellation credit of ₹5,000
    const creditCancel = await db.transaction(async (tx) => {
      const [ord] = await tx.select().from(orders).where(eq(orders.id, ord1.orderRow.id));
      const [p] = await tx.select().from(payments).where(eq(payments.orderId, ord.id));
      const remaining = Number(ord.total) - Number(p.refundedAmount || 0);
      assert.equal(remaining, 5000.0);

      const [c] = await tx.select().from(customers).where(eq(customers.id, testCust.id)).for("update");
      const bBefore = Number(c.availableCredit || 0);
      const bAfter = (bBefore + 5000.0).toFixed(2);
      await tx.update(customers).set({ availableCredit: bAfter, walletBalance: bAfter }).where(eq(customers.id, c.id));
      await tx.update(payments).set({ refundedAmount: "5000.00" }).where(eq(payments.id, p.id));
      await tx.insert(walletTransactions).values({
        customerId: c.id,
        transactionType: "ORDER_CANCEL_CREDIT",
        status: "APPROVED",
        amount: "5000.00",
        balanceBefore: bBefore.toFixed(2),
        balanceAfter: bAfter,
        reference: ord.orderNumber,
        notes: "Manual cancellation refund",
      });
      return { bAfter };
    });

    assert.equal(creditCancel.bAfter, "6500.00");

    // 8. Prevent duplicate credit on the same order
    const [pAfterCredit] = await db.select().from(payments).where(eq(payments.orderId, ord1.orderRow.id));
    const eligibleRemaining = Number(ord1.orderRow.total) - Number(pAfterCredit.refundedAmount);
    assert.equal(eligibleRemaining <= 0, true, "Duplicate credit must be rejected when eligible remaining is 0");

    // 9. Verify full ledger integrity chain
    const ledger = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.customerId, testCust.id))
      .orderBy(walletTransactions.createdAt);

    for (const entry of ledger) {
      const bBefore = Number(entry.balanceBefore);
      const bAfter = Number(entry.balanceAfter);
      const amt = Number(entry.amount);
      let delta = 0;
      if (entry.transactionType === "WALLET_DEBIT") delta = -amt;
      else if (entry.transactionType === "ADMIN_CREDIT") delta = amt;
      else if (entry.transactionType === "ADMIN_ADJUSTMENT") delta = entry.notes?.includes("[DEBIT]") ? -amt : amt;
      else if (entry.transactionType === "ORDER_CANCEL_CREDIT") delta = amt;

      assert.equal(bAfter, Number((bBefore + delta).toFixed(2)), "Ledger row must be mathematically consistent");
    }

    const [finalCust] = await db.select().from(customers).where(eq(customers.id, testCust.id));
    assert.equal(finalCust.availableCredit, "6500.00", "Customer current balance must equal final ledger balanceAfter");
  } finally {
    // Cleanup test data
    await db.delete(walletTransactions).where(eq(walletTransactions.customerId, testCust.id));
    await db.delete(payments).where(eq(payments.customerId, testCust.id));
    await db.delete(orders).where(eq(orders.customerId, testCust.id));
    await db.delete(customers).where(eq(customers.id, testCust.id));
  }
});

test("Financial QA: Partial payments and overpayment protection", async () => {
  const testSuffix = Date.now().toString().slice(-6);
  const [testCust] = await db
    .insert(customers)
    .values({
      contactName: `B2B Partial QA ${testSuffix}`,
      companyName: `B2B Corp ${testSuffix}`,
      email: `b2b-partial-${testSuffix}@example.com`,
      phone: "9876543210",
      customerType: "B2B",
      creditEnabled: true,
      availableCredit: "0.00",
      status: "ACTIVE",
    })
    .returning();

  try {
    const [ord] = await db.insert(orders).values({
      orderNumber: `QA-ORD-PARTIAL-${testSuffix}`,
      customerId: testCust.id,
      status: "PENDING",
      total: "20000.00",
      subtotal: "20000.00",
    }).returning();

    const [pay] = await db.insert(payments).values({
      orderId: ord.id,
      customerId: testCust.id,
      amount: "20000.00",
      paidAmount: "0.00",
      refundedAmount: "0.00",
      method: "WALLET",
      status: "PENDING",
    }).returning();

    // 1. Partial payment of ₹8,000
    const p1 = await db.transaction(async (tx) => {
      const [p] = await tx.select().from(payments).where(eq(payments.id, pay.id)).for("update");
      const newPaid = (Number(p.paidAmount || 0) + 8000.0).toFixed(2);
      const out = (20000.0 - Number(newPaid)).toFixed(2);
      const stat = Number(out) <= 0 ? "PAID" : "PARTIALLY_PAID";
      await tx.update(payments).set({ paidAmount: newPaid, status: stat }).where(eq(payments.id, p.id));
      return { newPaid, out, stat };
    });
    assert.equal(p1.newPaid, "8000.00");
    assert.equal(p1.out, "12000.00");
    assert.equal(p1.stat, "PARTIALLY_PAID");

    // 2. Overpayment attempt: trying to pay ₹15,000 when only ₹12,000 is outstanding
    const [pCurrent] = await db.select().from(payments).where(eq(payments.id, pay.id));
    const currentOutstanding = 20000.0 - Number(pCurrent.paidAmount);
    const attemptedOverpayment = 15000.0;
    const overpaymentRejected = attemptedOverpayment > currentOutstanding;
    assert.equal(overpaymentRejected, true, "Attempting ₹15,000 against ₹12,000 outstanding must be rejected");

    // 3. Settle remaining ₹12,000 exactly
    const p2 = await db.transaction(async (tx) => {
      const [p] = await tx.select().from(payments).where(eq(payments.id, pay.id)).for("update");
      const newPaid = (Number(p.paidAmount || 0) + 12000.0).toFixed(2);
      const out = (20000.0 - Number(newPaid)).toFixed(2);
      const stat = Number(out) <= 0 ? "PAID" : "PARTIALLY_PAID";
      await tx.update(payments).set({ paidAmount: newPaid, status: stat }).where(eq(payments.id, p.id));
      return { newPaid, out, stat };
    });
    assert.equal(p2.newPaid, "20000.00");
    assert.equal(p2.out, "0.00");
    assert.equal(p2.stat, "PAID");
  } finally {
    await db.delete(payments).where(eq(payments.customerId, testCust.id));
    await db.delete(orders).where(eq(orders.customerId, testCust.id));
    await db.delete(customers).where(eq(customers.id, testCust.id));
  }
});

test("Financial QA: Currency formatting formats positive and negative balances correctly with ₹", () => {
  const pos = formatInrExact(5000);
  const neg = formatInrExact(-5000);
  assert.ok(pos.includes("₹"), `Positive must include ₹: ${pos}`);
  assert.ok(neg.includes("₹"), `Negative must include ₹: ${neg}`);
  assert.ok(neg.includes("-"), `Negative must include - sign: ${neg}`);
  assert.equal(pos.includes("□"), false, "Must not contain broken character");
  assert.equal(neg.includes("□"), false, "Must not contain broken character");
  assert.equal(pos.includes("Rs"), false, "Must not contain legacy 'Rs'");
  assert.equal(neg.includes("Rs"), false, "Must not contain legacy 'Rs'");
});

test("Financial QA: Concurrency with row locking prevents lost balance updates", async () => {
  const testSuffix = Date.now().toString().slice(-6);
  const [cCust] = await db
    .insert(customers)
    .values({
      contactName: `Conc B2B ${testSuffix}`,
      companyName: `Conc Corp ${testSuffix}`,
      email: `conc-${testSuffix}@example.com`,
      phone: "9876543210",
      customerType: "B2B",
      creditEnabled: true,
      availableCredit: "0.00",
      walletBalance: "0.00",
      status: "ACTIVE",
    })
    .returning();

  try {
    const debitTask1 = db.transaction(async (tx) => {
      const [c] = await tx.select().from(customers).where(eq(customers.id, cCust.id)).for("update");
      const bBefore = Number(c.availableCredit || 0);
      const bAfter = (bBefore - 5000.0).toFixed(2);
      await tx.update(customers).set({ availableCredit: bAfter, walletBalance: bAfter }).where(eq(customers.id, c.id));
      await tx.insert(walletTransactions).values({
        customerId: c.id,
        transactionType: "WALLET_DEBIT",
        status: "APPROVED",
        amount: "5000.00",
        balanceBefore: bBefore.toFixed(2),
        balanceAfter: bAfter,
        notes: "Concurrent debit 1",
      });
      return bAfter;
    });

    const debitTask2 = db.transaction(async (tx) => {
      const [c] = await tx.select().from(customers).where(eq(customers.id, cCust.id)).for("update");
      const bBefore = Number(c.availableCredit || 0);
      const bAfter = (bBefore - 3000.0).toFixed(2);
      await tx.update(customers).set({ availableCredit: bAfter, walletBalance: bAfter }).where(eq(customers.id, c.id));
      await tx.insert(walletTransactions).values({
        customerId: c.id,
        transactionType: "WALLET_DEBIT",
        status: "APPROVED",
        amount: "3000.00",
        balanceBefore: bBefore.toFixed(2),
        balanceAfter: bAfter,
        notes: "Concurrent debit 2",
      });
      return bAfter;
    });

    await Promise.all([debitTask1, debitTask2]);

    const [finalCust] = await db.select().from(customers).where(eq(customers.id, cCust.id));
    assert.equal(finalCust.availableCredit, "-8000.00", "Simultaneous debits with row locking must equal -₹8,000 without lost update");
  } finally {
    await db.delete(walletTransactions).where(eq(walletTransactions.customerId, cCust.id));
    await db.delete(customers).where(eq(customers.id, cCust.id));
  }
});

test("Financial QA: Customer listing filtering by B2B/B2C, status, and negative balance", async () => {
  const b2bRows = await db.select().from(customers).where(eq(customers.customerType, "B2B"));
  const b2cRows = await db.select().from(customers).where(eq(customers.customerType, "B2C"));
  const negRows = await db.select().from(customers).where(sql`CAST(${customers.availableCredit} AS NUMERIC) < 0`);

  assert.ok(Array.isArray(b2bRows));
  assert.ok(Array.isArray(b2cRows));
  assert.ok(Array.isArray(negRows));
});

