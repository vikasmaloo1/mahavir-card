export type CustomerProfileFields = {
  contactName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  customerType?: string | null;
  city?: string | null;
  stateCode?: string | null;
};

export function isCustomerProfileComplete(customer: CustomerProfileFields | null | undefined) {
  if (!customer) return false;
  return Boolean(
    customer.contactName?.trim()
    && customer.phone?.trim()
    && customer.city?.trim()
    && customer.stateCode?.trim()
    && (customer.customerType !== "B2B" || customer.companyName?.trim()),
  );
}
