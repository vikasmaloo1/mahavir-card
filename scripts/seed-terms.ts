import dotenv from "dotenv";
import { count, eq } from "drizzle-orm";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { terms } from "../src/lib/db/schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL_UNPOOLED
  ?? process.env.POSTGRES_URL_NON_POOLING
  ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database connection string configured");
}

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

const defaultTerms = [
  {
    title: "Color Matching & Job Profiling",
    titleGu: "કલર મેચિંગ અને જોબ પ્રોફાઇલિંગ",
    titleHi: "कलर मैचिंग और जॉब प्रोफाइलिंग",
    content: "Same color will never match with any printing previously done (whether it is from us or from elsewhere, whether it is digital or offset), if you want the same color printing in future, then get job profile saved with us, extra charges will be payable against job profiling.",
    contentGu: "અગાઉ કરેલા કોઈપણ પ્રિન્ટીંગ સાથે સમાન રંગ ક્યારેય મેળ ખાશે નહીં (પછી ભલે તે અમારા દ્વારા કરવામાં આવ્યું હોય કે અન્ય જગ્યાએથી, ડિજિટલ હોય કે ઑફસેટ). જો તમને ભવિષ્યમાં સમાન રંગનું પ્રિન્ટીંગ જોઈતું હોય, તો અમારી પાસે જોબ પ્રોફાઇલ સેવ કરાવો, જોબ પ્રોફાઇલિંગ માટે વધારાનો ચાર્જ ચૂકવવો પડશે.",
    contentHi: "पहले किए गए किसी भी प्रिंटिंग से वही रंग कभी मेल नहीं खाएगा (चाहे वह हमारे द्वारा किया गया हो या कहीं और से, चाहे वह डिजिटल हो या ऑफसेट)। यदि आप भविष्य में समान रंग की प्रिंटिंग चाहते हैं, तो हमारे पास जॉब प्रोफाइल सेव करवाएं, जॉब प्रोफाइलिंग के लिए अतिरिक्त शुल्क देय होगा।",
    category: "COLOR_QUALITY",
    isImportant: false,
    sortOrder: 1,
    isActive: true,
  },
  {
    title: "Goods Responsibility & Godown Dispatch",
    titleGu: "માલની જવાબદારી અને ગોડાઉન ડિસ્પેચ",
    titleHi: "माल की ज़िम्मेदारी और गोदाम से डिस्पैच",
    content: "IMPORTANT : - I accept Mahavir Card's responsibility ceases the moment the goods leave company's godown.",
    contentGu: "મહત્વપૂર્ણ : - હું સ્વીકારું છું કે મહાવીર કાર્ડની જવાબદારી માલ કંપનીના ગોડાઉનમાંથી બહાર નીકળતાની સાથે જ સમાપ્ત થઈ જાય છે.",
    contentHi: "महत्वपूर्ण : - मैं स्वीकार करता/करती हूँ कि महावीर कार्ड की ज़िम्मेदारी माल कंपनी के गोदाम से बाहर निकलते ही समाप्त हो जाती है।",
    category: "DISPATCH_TRANSIT",
    isImportant: true,
    sortOrder: 2,
    isActive: true,
  },
  {
    title: "Jurisdiction & Governing Law",
    titleGu: "કાનૂની ન્યાયક્ષેત્ર",
    titleHi: "कानूनी क्षेत्राधिकार",
    content: "All the legal matters are subject to Ahmedabad Jurisdiction Only.",
    contentGu: "તમામ કાનૂની બાબતો અને વિવાદો ફક્ત અમદાવાદ ન્યાયક્ષેત્ર હેઠળ રહેશે.",
    contentHi: "सभी कानूनी मामले और विवाद केवल अहमदाबाद क्षेत्राधिकार के अधीन हैं।",
    category: "LEGAL",
    isImportant: false,
    sortOrder: 3,
    isActive: true,
  },
  {
    title: "B2B Trade Policy & Prohibited Content",
    titleGu: "B2B ટ્રેડ પોલિસી અને પ્રતિબંધિત સામગ્રી નિયમો",
    titleHi: "B2B ट्रेड पॉलिसी और प्रतिबंधित सामग्री नियम",
    content: "Mahavir Card is a dedicated B2B trade printing platform that prints orders strictly for verified printing presses, graphic designers, advertising agencies, and channel partners only. We do not accept fake certificates, government identity documents, illegal currency copies, defamatory material, or copyrighted logos without verified written authorization. The customer/partner bears sole and complete legal liability for all submitted designs.",
    contentGu: "મહાવીર કાર્ડ એ માત્ર પ્રિન્ટીંગ પ્રેસ, ગ્રાફિક ડિઝાઇનર્સ, જાહેરાત એજન્સીઓ અને ચેનલ પાર્ટનર્સ માટેનું B2B ટ્રેડ પ્લેટફોર્મ છે. કાનૂની પરવાનગી વગર નકલી ઓળખપત્રો, સરકારી દસ્તાવેજો, ચલણી નોટો કે કૉપિરાઇટ કરેલા લોગો છાપવાની સખત મનાઈ છે. સબમિટ કરેલી આર્ટવર્ક માટે ગ્રાહક પોતે ૧૦૦% કાનૂની રીતે જવાબદાર રહેશે.",
    contentHi: "महावीर कार्ड केवल प्रिंटिंग प्रेस, ग्राफिक डिजाइनरों, विज्ञापन एजेंसियों और चैनल भागीदारों के लिए एक B2B ट्रेड प्रिंटिंग प्लेटफॉर्म है। कानूनी अनुमति के बिना नकली पहचान पत्र, सरकारी दस्तावेज, मुद्रा या कॉपीराइट सामग्री छापना सख्त वर्जित है। सबमिट की गई आर्टवर्क के लिए ग्राहक पूरी तरह कानूनी रूप से जिम्मेदार रहेगा।",
    category: "LEGAL",
    isImportant: false,
    sortOrder: 4,
    isActive: true,
  },
  {
    title: "Cutting & Trimming Tolerances",
    titleGu: "કટીંગ અને ટ્રીમીંગ માર્જિન મર્યાદા",
    titleHi: "कटिंग और ट्रिमिंग मार्जिन टॉलरेंस",
    content: "In commercial offset and digital gang-run printing, a mechanical cutting tolerance of up to ±1.5 mm to 2 mm is standard across sheet finishing. All essential text, phone numbers, and critical logo elements must strictly remain within the specified safe margin (e.g. 83 × 47 mm on standard visiting cards) to prevent trimming clipping.",
    contentGu: "કોમર્શિયલ ઑફસેટ અને ગેંગ-રન પ્રિન્ટીંગમાં ±1.5 mm થી 2 mm સુધીનો મિકેનિકલ કટીંગ તફાવત સામાન્ય ગણાય છે. તમામ મહત્વપૂર્ણ ટેક્સ્ટ, મોબાઈલ નંબર અને લોગો કટીંગમાં કપાઈ ન જાય તે માટે સેફ માર્જિન (૮૩ × ૪૭ mm) ની અંદર જ રાખવા જરૂરી છે.",
    contentHi: "कमर्शियल ऑफसेट और गैंग-रन प्रिंटिंग में ±1.5 मिमी से 2 मिमी तक का कटिंग अंतर सामान्य माना जाता है। सभी महत्वपूर्ण टेक्स्ट, फोन नंबर और लोगो को कटिंग से सुरक्षित रखने के लिए सेफ मार्जिन (83 × 47 मिमी) के अंदर रखना अनिवार्य है।",
    category: "COLOR_QUALITY",
    isImportant: false,
    sortOrder: 5,
    isActive: true,
  },
  {
    title: "Artwork & CorelDRAW (CDR) Guidelines",
    titleGu: "આર્ટવર્ક અને કોરલડ્રો (CDR) ફાઇલ નિયમો",
    titleHi: "आर्टवर्क और कोरलड्रॉ (CDR) फ़ाइल दिशानिर्देश",
    content: "All print production is executed strictly from client-submitted CorelDRAW (CDR) vector artwork. Customers must convert all text and fonts to curves (Ctrl+Q) and verify contact numbers, dimensions, orientation, and spelling before submitting. The company accepts no liability for layout, spelling, or typographical errors present in customer-submitted files.",
    contentGu: "તમામ પ્રિન્ટીંગ ઓર્ડર ગ્રાહક દ્વારા અપલોડ કરાયેલ કોરલડ્રો (CDR) ફાઇલ મુજબ જ પ્રોસેસ થાય છે. ફાઇલ સબમિટ કરતાં પહેલાં તમામ ફોન્ટ્સને કર્વ્ઝ (Ctrl+Q) કરવા તેમજ સ્પેલિંગ, મોબાઈલ નંબર અને સાઈઝ ચકાસવી ગ્રાહકની પોતાની જવાબદારી છે. ફાઇલમાં રહેલી કોઈપણ ભૂલ માટે કંપની જવાબદાર રહેશે નહીં.",
    contentHi: "सभी प्रिंटिंग ऑर्डर ग्राहक द्वारा अपलोड की गई कोरलड्रॉ (CDR) फ़ाइल के अनुसार ही तैयार होते हैं। फ़ाइल जमा करने से पहले सभी फोंट को कर्व्स (Ctrl+Q) में बदलना और स्पेलिंग, मोबाइल नंबर तथा साइज की जांच करना ग्राहक की ज़िम्मेदारी है। फ़ाइल में मौजूद किसी भी त्रुटि के लिए कंपनी जिम्मेदार नहीं होगी।",
    category: "ARTWORK",
    isImportant: false,
    sortOrder: 6,
    isActive: true,
  },
  {
    title: "Paper Grammage & Lamination Batch Variation",
    titleGu: "કાગળનું વજન (GSM) અને લેમિનેશન વેરીએશન",
    titleHi: "कागज का वजन (GSM) और लेमिनेशन भिन्नता",
    content: "Paper sheets, thermal matt films, gloss UV, and velvet lamination are subject to standard paper-mill batch variations (up to ±5% in weight, bulk, and shade). Color tone and texture may slightly differ between separate production batches and seasons.",
    contentGu: "કાગળની શીટ્સ, થર્મલ મેટ ફિલ્મ, યુવી અને વેલ્વેટ લેમિનેશનમાં પેપર મિલના લોટ મુજબ ±5% સુધીનો સામાન્ય તફાવત (વજન, કાગળની જાડાઈ અને શેડ) આવી શકે છે. અલગ-અલગ બેચમાં થોડો તફાવત સ્વાભાવિક છે.",
    contentHi: "कागज की शीट, थर्मल मैट फिल्म, यूवी और वेलवेट लेमिनेशन में पेपर मिल लॉट के अनुसार ±5% तक का सामान्य अंतर (वजन, मोटाई और शेड) आ सकता है। अलग-अलग बैचों में मामूली अंतर स्वाभाविक है।",
    category: "COLOR_QUALITY",
    isImportant: false,
    sortOrder: 7,
    isActive: true,
  },
  {
    title: "Production Turnaround & Schedule",
    titleGu: "ઉત્પાદન સમય અને ડિસ્પેચ સમયપત્રક",
    titleHi: "उत्पादन समय और डिस्पैच शेड्यूल",
    content: "Stated working days (e.g. 2–3 working days for visiting cards, 7–10 working days for specialty premium cards) are operational estimates. Sundays, official public holidays, machinery maintenance, electricity disruptions, transport strikes, or force majeure events are excluded from turnaround calculation.",
    contentGu: "જણાવેલ કામકાજના દિવસો (દા.ત. વિઝીટીંગ કાર્ડ માટે ૨-૩ દિવસ, પ્રીમિયમ કાર્ડ માટે ૭-૧૦ દિવસ) અંદાજિત ઉત્પાદન સમય છે. રવિવાર, જાહેર રજાઓ, મશીનરી મેન્ટેનન્સ, પાવર કટ, ટ્રાન્સપોર્ટ હડતાળ કે કુદરતી આપત્તિના દિવસો સમયગાળામાં ગણાશે નહીં.",
    contentHi: "बताए गए कार्य दिवस (जैसे विजिटिंग कार्ड के लिए 2-3 दिन, प्रीमियम कार्ड के लिए 7-10 दिन) अनुमानित उत्पादन समय हैं। रविवार, सार्वजनिक अवकाश, मशीन रखरखाव, बिजली रुकावट, परिवहन हड़ताल या प्राकृतिक आपदाओं के दिनों को इसमें शामिल नहीं किया जाएगा।",
    category: "DISPATCH_TRANSIT",
    isImportant: false,
    sortOrder: 8,
    isActive: true,
  },
  {
    title: "Defect Claims & Inspection Policy",
    titleGu: "ખામી, અછત અને પાર્સલ તપાસ નીતિ",
    titleHi: "दोष संबंधी दावे और निरीक्षण नीति",
    content: "Any discrepancy regarding print defects, cutting issues, or parcel damage must be formally reported within 48 hours of parcel delivery along with unboxing video and clear photographs. Custom-manufactured printing jobs cannot be cancelled, returned, or refunded once processed into production.",
    contentGu: "પ્રિન્ટીંગ ખામી, કટીંગ ખામી કે પાર્સલ નુકસાની અંગેની કોઈપણ ફરિયાદ ડિલિવરી મળ્યાના ૪૮ કલાકની અંદર અનબોક્સિંગ વિડીયો અને ફોટા સાથે જણાવવી જરૂરી છે. કસ્ટમ પ્રિન્ટીંગ ઓર્ડર એકવાર પ્રોડક્શનમાં ગયા પછી રદ કે પરત થઈ શકશે નહીં.",
    contentHi: "प्रिंटिंग दोष, कटिंग समस्या या पार्सल क्षति संबंधी कोई भी शिकायत डिलीवरी के 48 घंटों के भीतर अनबॉक्सिंग वीडियो और फोटो के साथ दर्ज करनी होगी। कस्टम प्रिंटिंग ऑर्डर एक बार उत्पादन में जाने के बाद रद्द या वापस नहीं किए जा सकते।",
    category: "GENERAL",
    isImportant: false,
    sortOrder: 9,
    isActive: true,
  },
];

async function seed() {
  console.log("Seeding Terms & Conditions...");
  
  for (const item of defaultTerms) {
    const [existing] = await db
      .select()
      .from(terms)
      .where(eq(terms.sortOrder, item.sortOrder))
      .limit(1);

    if (existing) {
      await db
        .update(terms)
        .set({
          title: item.title,
          titleGu: item.titleGu,
          titleHi: item.titleHi,
          content: item.content,
          contentGu: item.contentGu,
          contentHi: item.contentHi,
          category: item.category,
          isImportant: item.isImportant,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
          updatedAt: new Date(),
        })
        .where(eq(terms.id, existing.id));
      console.log(`Updated term: ${item.title}`);
    } else {
      await db.insert(terms).values(item);
      console.log(`Inserted term: ${item.title}`);
    }
  }

  const [totalCount] = await db.select({ value: count() }).from(terms);
  console.log(`Seeding complete. Total terms in DB: ${totalCount.value}`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  pool.end();
  process.exit(1);
});
