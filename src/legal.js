// Legal pages for a German online shop: Impressum, AGB, Widerrufsbelehrung (with the model withdrawal form),
// Datenschutzerklärung and Versand & Zahlung. The details (name, address, VAT, fees) come from the admin settings.
// The German text is the binding one; English is a courtesy translation, and the Arabic pages show the German
// text with a short note. These are drafts: have them checked (e.g. by a lawyer or a service such as
// Händlerbund / IT-Recht Kanzlei) before going live.

import { esc, money, countryName, shippingCountries, parseJSON } from './lib.js';
import { formatIban } from './girocode.js';

export const LEGAL_PAGES = ['impressum', 'agb', 'widerruf', 'datenschutz', 'versand'];
export const LEGAL_UPDATED = '2026-11-24';

function info(s) {
  return {
    name: esc(s.legal_name || 'Khadija Hakki'),
    company: esc(s.legal_company || s.store_name || 'Khachija'),
    address: esc(s.legal_address || ''),
    email: esc(s.contact_email || ''),
    phone: esc(s.phone || ''),
    vatId: esc(s.legal_vat_id || ''),
    wid: esc(s.legal_wid || ''),
    register: esc(s.legal_register || ''),
    small: s.vat_mode !== 'included',
    store: esc(s.store_name || 'Khachija'),
  };
}

const p = (...lines) => lines.map((l) => `<p>${l}</p>`).join('');
const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

function shippingTable(s, lang) {
  const rates = parseJSON(s.shipping_rates || '{}', {});
  const free = Number(s.free_shipping_over) || 0;
  const rows = shippingCountries(s).map((c) => {
    const fee = c === 'DE' ? Number(s.shipping_fee) || 0 : Number(rates[c]) || 0;
    const freeNote = free && (c === 'DE' || s.free_shipping_all === '1') ? (lang === 'en' ? ` (free from ${money(free, lang)})` : ` (kostenlos ab ${money(free, lang)})`) : '';
    return `<tr><td>${esc(countryName(c, lang === 'en' ? 'en' : 'de'))}</td><td>${esc(money(fee, lang))}${esc(freeNote)}</td></tr>`;
  });
  return `<table class="legal-table"><thead><tr><th>${lang === 'en' ? 'Country' : 'Land'}</th><th>${lang === 'en' ? 'Shipping (DHL)' : 'Versandkosten (DHL)'}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

const DE = {
  impressum: (s) => {
    const i = info(s);
    return {
      title: 'Impressum',
      sections: [
        ['Angaben gemäß § 5 DDG', p(`${i.company}<br>Inhaberin: ${i.name}<br>${i.address.replace(/, /g, '<br>')}`)],
        ['Kontakt', p(`${i.phone ? `Telefon: ${i.phone}<br>` : ''}E-Mail: <a href="mailto:${i.email}">${i.email}</a>`)],
        ...(i.vatId || i.wid ? [['Umsatzsteuer-ID', p(`${i.vatId ? `Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: ${i.vatId}` : ''}${i.vatId && i.wid ? '<br>' : ''}${i.wid ? `Wirtschafts-Identifikationsnummer gemäß § 139c AO: ${i.wid}` : ''}`)]] : []),
        ...(i.register ? [['Registereintrag', p(i.register)]] : []),
        ...(i.small ? [['Umsatzsteuer', p('Kleinunternehmerin im Sinne von § 19 UStG. Es wird keine Umsatzsteuer berechnet und ausgewiesen.')]] : []),
        ['Verantwortlich für den Inhalt', p(`${i.name}, ${i.address}`)],
        ['Verbraucherstreitbeilegung', p('Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.')],
        ['Haftung für Inhalte und Links', p('Als Diensteanbieterin sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Für die Inhalte verlinkter externer Seiten sind ausschließlich deren Betreiber verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Inhalte umgehend.')],
        ['Urheberrecht', p('Die Inhalte und Fotos dieser Website unterliegen dem deutschen Urheberrecht. Eine Verwendung außerhalb der Grenzen des Urheberrechts bedarf unserer schriftlichen Zustimmung.')],
      ],
    };
  },
  agb: (s) => {
    const i = info(s);
    const days = esc(s.bank_days || '7');
    return {
      title: 'Allgemeine Geschäftsbedingungen (AGB)',
      sections: [
        ['§ 1 Geltungsbereich', p(`Diese AGB gelten für alle Bestellungen über den Online-Shop ${i.store} von ${i.company}, Inhaberin ${i.name}, ${i.address} (im Folgenden „wir“). Abweichende Bedingungen des Kunden gelten nicht. Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB).`)],
        ['§ 2 Vertragsschluss', p('Die Darstellung der Produkte im Shop stellt kein rechtlich bindendes Angebot, sondern eine Aufforderung zur Bestellung dar. Durch Anklicken des Buttons „Zahlungspflichtig bestellen“ geben Sie eine verbindliche Bestellung der Waren im Warenkorb ab. Vor dem Absenden können Sie Ihre Angaben jederzeit prüfen und korrigieren.', 'Wir bestätigen den Eingang Ihrer Bestellung unmittelbar per E-Mail. Der Kaufvertrag kommt mit dieser Bestellbestätigung zustande. Bei Zahlung mit PayPal kommt der Vertrag spätestens mit Abschluss des Zahlungsvorgangs bei PayPal zustande.', 'Der Vertragstext wird von uns gespeichert und Ihnen mit der Bestellbestätigung per E-Mail zugesandt. Die AGB können Sie jederzeit auf dieser Seite abrufen. Vertragssprache ist Deutsch.')],
        ['§ 3 Preise und Versandkosten', p(`Alle Preise sind Endpreise in Euro. ${i.small ? 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.' : 'Sie enthalten die gesetzliche Mehrwertsteuer.'} Zusätzlich fallen Versandkosten an, die auf der Seite <a href="versand">Versand &amp; Zahlung</a> und im Bestellprozess deutlich angegeben werden.`)],
        ['§ 4 Zahlung', p('Sie können per PayPal, per Vorkasse (Banküberweisung) oder per Nachnahme (nur innerhalb Deutschlands, zzgl. Nachnahmegebühr) bezahlen.', `Bei Vorkasse nennen wir Ihnen unsere Bankverbindung in der Bestellbestätigung. Bitte überweisen Sie den Betrag innerhalb von ${days} Tagen. Die Ware wird nach Zahlungseingang versendet. Geht die Zahlung nicht innerhalb von 14 Tagen ein, können wir vom Vertrag zurücktreten.`, 'Bei Zahlung per PayPal werden Sie im Bestellprozess auf die Seite von PayPal weitergeleitet. Die Zahlung wird mit Abschluss der Bestellung durchgeführt.')],
        ['§ 5 Lieferung', p('Wir liefern mit DHL an die von Ihnen angegebene Lieferadresse. Die Lieferzeit beträgt innerhalb Deutschlands in der Regel 2–4 Werktage, bei Vorkasse ab Zahlungseingang. Sollte ein Produkt nicht verfügbar sein, informieren wir Sie unverzüglich und erstatten bereits geleistete Zahlungen.')],
        ['§ 6 Eigentumsvorbehalt', p('Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.')],
        ['§ 7 Widerrufsrecht', p('Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Einzelheiten finden Sie in unserer <a href="widerruf">Widerrufsbelehrung</a>. Das Widerrufsrecht erlischt bei versiegelten Waren, die aus Gründen des Gesundheitsschutzes oder der Hygiene nicht zur Rückgabe geeignet sind, wenn ihre Versiegelung nach der Lieferung entfernt wurde.')],
        ['§ 8 Gewährleistung', p('Es gilt das gesetzliche Mängelhaftungsrecht. Bitte reklamieren Sie offensichtliche Transportschäden möglichst sofort beim Zusteller und informieren Sie uns. Ihre gesetzlichen Ansprüche bleiben davon unberührt.')],
        ['§ 9 Hinweise zu Naturkosmetik', p('Unsere Produkte werden aus Naturrohstoffen in Handarbeit hergestellt. Farbe, Duft und Konsistenz können daher leicht variieren. Bitte beachten Sie die Inhaltsstoffe und Anwendungshinweise und machen Sie bei empfindlicher Haut zunächst einen Verträglichkeitstest.')],
        ['§ 10 Streitbeilegung und Schlussbestimmungen', p('Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts; bei Verbrauchern gilt diese Rechtswahl nur, soweit nicht der Schutz durch zwingende Bestimmungen des Rechts ihres gewöhnlichen Aufenthaltsstaates entzogen wird.')],
      ],
    };
  },
  widerruf: (s) => {
    const i = info(s);
    return {
      title: 'Widerrufsbelehrung',
      sections: [
        ['Widerrufsrecht', p('Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.', 'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat. Bei mehreren Waren, die getrennt geliefert werden, ab dem Tag, an dem Sie die letzte Ware in Besitz genommen haben.', `Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${i.company}, ${i.name}, ${i.address}, E-Mail: ${i.email}${i.phone ? `, Telefon: ${i.phone}` : ''}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.`, 'Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.')],
        ['Folgen des Widerrufs', p('Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.', 'Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.', `Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns (${i.company}, ${i.address}) zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden. Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.`, 'Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.')],
        ['Ausschluss bzw. vorzeitiges Erlöschen des Widerrufsrechts', p('Das Widerrufsrecht erlischt vorzeitig bei Verträgen zur Lieferung versiegelter Waren, die aus Gründen des Gesundheitsschutzes oder der Hygiene nicht zur Rückgabe geeignet sind, wenn ihre Versiegelung nach der Lieferung entfernt wurde. Das betrifft insbesondere geöffnete Kosmetikprodukte wie Seifen, Pulver, Öle und Peelings.')],
        ['Muster-Widerrufsformular', `${p('(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)')}<div class="legal-form">${p(`An: ${i.company}, ${i.name}, ${i.address}, E-Mail: ${i.email}`, 'Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*):', '_______________________________________________', 'Bestellt am (*) / erhalten am (*): ____________________', 'Bestellnummer: ____________________', 'Name des/der Verbraucher(s): ____________________', 'Anschrift des/der Verbraucher(s): ____________________', 'Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ____________________', 'Datum: ____________________', '(*) Unzutreffendes streichen.')}</div>`],
      ],
    };
  },
  datenschutz: (s) => {
    const i = info(s);
    const pixels = String(s.meta_pixel_id || '').trim() || String(s.tiktok_pixel_id || '').trim();
    return {
      title: 'Datenschutzerklärung',
      sections: [
        ['1. Verantwortliche', p(`${i.company}, ${i.name}, ${i.address}, E-Mail: <a href="mailto:${i.email}">${i.email}</a>${i.phone ? `, Telefon: ${i.phone}` : ''}.`)],
        ['2. Hosting und Server-Logfiles', p('Diese Website wird bei Cloudflare, Inc. (101 Townsend St., San Francisco, CA 94107, USA) betrieben. Beim Aufruf werden technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser) verarbeitet, um die Website sicher und stabil bereitzustellen (Art. 6 Abs. 1 lit. f DSGVO). Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert. Zum Schutz vor Missbrauch speichern wir zeitweise nur einen verschlüsselten Kurzwert (Hash) der IP-Adresse, nie die Adresse selbst.')],
        ['3. Bestellungen', p('Für die Abwicklung Ihrer Bestellung verarbeiten wir Name, Lieferadresse, E-Mail-Adresse, optional Telefonnummer, bestellte Produkte und Zahlungsart (Art. 6 Abs. 1 lit. b DSGVO). Zur Lieferung geben wir Name und Adresse an DHL (Deutsche Post DHL Group) weiter. Handels- und steuerrechtliche Daten bewahren wir gemäß den gesetzlichen Fristen (bis zu 10 Jahre) auf (Art. 6 Abs. 1 lit. c DSGVO).')],
        ['4. Zahlungsdienstleister PayPal', p('Wenn Sie mit PayPal bezahlen, werden Sie zu PayPal (Europe) S.à r.l. et Cie, S.C.A., 22–24 Boulevard Royal, L-2449 Luxemburg, weitergeleitet. Dabei übermitteln wir Bestelldaten (Betrag, Artikel, Lieferadresse, E-Mail) an PayPal (Art. 6 Abs. 1 lit. b DSGVO). Es gilt die Datenschutzerklärung von PayPal: <a href="https://www.paypal.com/de/legalhub/privacy-full" rel="noopener">paypal.com/de/legalhub/privacy-full</a>.')],
        ['5. E-Mails', p('Bestellbestätigungen und Versandinformationen versenden wir über den Dienst Brevo (Sendinblue SAS, 55 Rue d’Amsterdam, 75008 Paris, Frankreich) als Auftragsverarbeiter (Art. 28 DSGVO).')],
        ['6. Newsletter', p('Wenn Sie sich für den Newsletter anmelden, speichern wir Ihre E-Mail-Adresse und Sprache, um Ihnen Informationen zu Produkten und Angeboten zu senden (Art. 6 Abs. 1 lit. a DSGVO). Sie können Ihre Einwilligung jederzeit widerrufen, z. B. über den Abmeldelink oder per E-Mail an uns.')],
        ['7. Lokale Speicherung', p('Ihr Warenkorb, Ihre Sprache und zuletzt angesehene Produkte werden nur in Ihrem Browser gespeichert (localStorage bzw. ein technisch notwendiges Sprach-Cookie). Diese Daten werden nicht an uns übertragen, bis Sie eine Bestellung absenden (§ 25 Abs. 2 TDDDG).')],
        ['8. Schriftarten', p('Diese Website lädt Schriftarten von Google Fonts (Google Ireland Limited). Dabei wird Ihre IP-Adresse an Google übertragen (Art. 6 Abs. 1 lit. f DSGVO, Interesse an einer einheitlichen Darstellung).')],
        ...(pixels ? [['9. Werbe-Pixel (nur mit Einwilligung)', p('Mit Ihrer Einwilligung setzen wir das Meta-Pixel (Meta Platforms Ireland Ltd.) und/oder das TikTok-Pixel (TikTok Technology Ltd.) ein, um die Wirkung unserer Werbung zu messen (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Ohne Ihre Einwilligung werden diese nicht geladen. Sie können Ihre Einwilligung über „Cookie-Einstellungen“ im Seitenfuß jederzeit widerrufen.')]] : []),
        ['Ihre Rechte', p('Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, eine erteilte Einwilligung jederzeit zu widerrufen. Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. beim Hamburgischen Beauftragten für Datenschutz und Informationsfreiheit.')],
      ],
    };
  },
  versand: (s) => {
    const fee = money(Number(s.cod_fee) || 0, 'de');
    const days = esc(s.bank_days || '7');
    return {
      title: 'Versand & Zahlung',
      sections: [
        ['Versandkosten', `${shippingTable(s, 'de')}${p('Alle Preise sind Endpreise. Wir versenden mit DHL aus Hamburg.')}`],
        ['Lieferzeit', p(`Innerhalb Deutschlands ${esc(s.delivery_days || '2-4').replace('-', '–')} Werktage, ins Ausland ca. 4–8 Werktage. Bei Vorkasse beginnt die Lieferzeit mit dem Zahlungseingang.`)],
        ['Zahlungsarten', ul([
          '<strong>PayPal</strong>: auch Kreditkarte, Lastschrift und „Später bezahlen“ über PayPal. Die Zahlung erfolgt direkt bei der Bestellung.',
          `<strong>Vorkasse / Überweisung</strong>: Sie erhalten unsere Bankverbindung in der Bestellbestätigung. Bitte überweisen Sie innerhalb von ${days} Tagen und geben Sie die Bestellnummer als Verwendungszweck an. Wir versenden nach Zahlungseingang.${s.bank_iban ? ` IBAN: ${esc(formatIban(s.bank_iban))}` : ''}`,
          `<strong>Nachnahme (DHL)</strong>: nur innerhalb Deutschlands. Sie bezahlen bar beim DHL-Boten. Nachnahmegebühr: ${esc(fee)}.`,
        ])],
      ],
    };
  },
};

const EN = {
  impressum: (s) => {
    const i = info(s);
    return {
      title: 'Legal notice',
      sections: [
        ['Information according to § 5 DDG', p(`${i.company}<br>Owner: ${i.name}<br>${i.address.replace(/, /g, '<br>')}`)],
        ['Contact', p(`${i.phone ? `Phone: ${i.phone}<br>` : ''}Email: <a href="mailto:${i.email}">${i.email}</a>`)],
        ...(i.vatId || i.wid ? [['VAT ID', p(`${i.vatId ? `VAT identification number (§ 27 a UStG): ${i.vatId}` : ''}${i.vatId && i.wid ? '<br>' : ''}${i.wid ? `Business identification number (W-IdNr., § 139c AO): ${i.wid}` : ''}`)]] : []),
        ...(i.register ? [['Commercial register', p(i.register === 'Kein Handelsregistereintrag' ? 'Not entered in the commercial register' : i.register)]] : []),
        ...(i.small ? [['VAT', p('Small business under § 19 UStG: no VAT is charged or shown.')]] : []),
        ['Consumer dispute resolution', p('We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.')],
      ],
    };
  },
  agb: (s) => {
    const i = info(s);
    return {
      title: 'Terms and conditions',
      sections: [
        ['Note', p('This is a courtesy translation. Only the <a href="/de/agb">German version</a> is legally binding.')],
        ['1. Scope', p(`These terms apply to all orders placed in the ${i.store} online shop of ${i.company}, owner ${i.name}, ${i.address}.`)],
        ['2. Contract', p('Clicking “Place order with obligation to pay” submits a binding order. We confirm receipt by email immediately; the contract is concluded with this confirmation (with PayPal at the latest when the payment is completed). The contract language is German.')],
        ['3. Prices and shipping', p(`All prices are final prices in euros. ${i.small ? 'No VAT is charged under § 19 UStG.' : 'They include statutory VAT.'} Shipping costs are shown on the <a href="versand">Shipping &amp; payment</a> page and during checkout.`)],
        ['4. Payment', p('PayPal, bank transfer in advance (we ship after the payment arrives) or cash on delivery (Germany only, plus a fee).')],
        ['5. Delivery', p('We ship with DHL, usually within 2–4 working days in Germany.')],
        ['6. Right of withdrawal', p('Consumers have a statutory right of withdrawal, see the <a href="widerruf">right of withdrawal</a>. It expires for sealed goods that are not suitable for return for health or hygiene reasons once the seal has been removed.')],
        ['7. Warranty and law', p('Statutory warranty rights apply. German law applies, excluding the UN Convention on Contracts for the International Sale of Goods, without depriving consumers of mandatory protection of their country of residence.')],
      ],
    };
  },
  widerruf: (s) => {
    const i = info(s);
    return {
      title: 'Right of withdrawal',
      sections: [
        ['Note', p('This is a courtesy translation. Only the <a href="/de/widerruf">German version</a> is legally binding.')],
        ['Right of withdrawal', p('You have the right to withdraw from this contract within fourteen days without giving any reason. The withdrawal period is fourteen days from the day on which you, or a third party other than the carrier indicated by you, take possession of the goods.', `To exercise the right of withdrawal, you must inform us (${i.company}, ${i.name}, ${i.address}, email: ${i.email}) of your decision by an unequivocal statement (e.g. a letter sent by post or an email). You may use the model withdrawal form, but it is not obligatory. It is sufficient to send your notice before the withdrawal period has expired.`)],
        ['Effects of withdrawal', p('If you withdraw, we will reimburse all payments received from you, including the costs of delivery (except supplementary costs from choosing a delivery type other than the least expensive standard delivery), without undue delay and at the latest within fourteen days of receiving your notice, using the same means of payment. We may withhold the reimbursement until we have received the goods back or you have supplied evidence of having sent them back. You shall send back the goods within fourteen days and bear the direct cost of returning them. You are only liable for any diminished value resulting from handling other than what is necessary to establish the nature, characteristics and functioning of the goods.')],
        ['Exclusion', p('The right of withdrawal expires for sealed goods which are not suitable for return due to health protection or hygiene reasons if they were unsealed after delivery, in particular opened cosmetics.')],
        ['Model withdrawal form', `<div class="legal-form">${p(`To: ${i.company}, ${i.name}, ${i.address}, email: ${i.email}`, 'I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*): ____________________', 'Ordered on (*) / received on (*): ____________________', 'Order number: ____________________', 'Name and address of consumer(s): ____________________', 'Signature (only if this form is notified on paper) and date: ____________________', '(*) Delete as appropriate.')}</div>`],
      ],
    };
  },
  datenschutz: (s) => {
    const i = info(s);
    return {
      title: 'Privacy policy',
      sections: [
        ['Note', p('This is a summary in English. The <a href="/de/datenschutz">German privacy policy</a> contains all details.')],
        ['Controller', p(`${i.company}, ${i.name}, ${i.address}, email: <a href="mailto:${i.email}">${i.email}</a>.`)],
        ['What we process', ul(['Technical data needed to deliver the website (Cloudflare), with only a hashed IP for abuse protection.', 'Order data (name, address, email, optional phone, products, payment method) to fulfil your order; name and address are passed to DHL.', 'PayPal receives order data if you pay with PayPal.', 'Order emails are sent via Brevo.', 'Newsletter: your email address, only with your consent.', 'Your cart and language stay in your browser.', 'Advertising pixels (Meta, TikTok) only load with your consent.'])],
        ['Your rights', p('You have the right of access, rectification, erasure, restriction, data portability and objection (Art. 15–21 GDPR), to withdraw consent at any time and to lodge a complaint with a supervisory authority.')],
      ],
    };
  },
  versand: (s) => ({
    title: 'Shipping & payment',
    sections: [
      ['Shipping costs', `${shippingTable(s, 'en')}${p('We ship with DHL from Hamburg.')}`],
      ['Delivery time', p(`Germany: ${esc(s.delivery_days || '2-4').replace('-', '–')} working days. Other countries: about 4–8 working days. With bank transfer, delivery time starts when the payment arrives.`)],
      ['Payment methods', ul(['<strong>PayPal</strong>: including card, direct debit and Pay Later through PayPal.', `<strong>Bank transfer in advance</strong>: please pay within ${esc(s.bank_days || '7')} days using your order number as reference. We ship after the payment arrives.`, `<strong>Cash on delivery (DHL)</strong>: Germany only, fee ${esc(money(Number(s.cod_fee) || 0, 'en'))}.`])],
    ],
  }),
};

const AR_NOTE = {
  impressum: 'البيانات القانونية للمتجر وفق القانون الألماني. النص الألماني أدناه هو المرجع.',
  agb: 'الشروط العامة للبيع. النص الألماني أدناه هو النص الملزم قانونيًا. تتوفر أيضًا نسخة <a href="/en/agb">بالإنجليزية</a>.',
  widerruf: 'لديك حق العدول عن الشراء خلال 14 يومًا دون ذكر الأسباب. مستحضرات التجميل المفتوحة مستثناة لأسباب صحية. النص الألماني أدناه هو الملزم.',
  datenschutz: 'سياسة الخصوصية. نعالج بياناتك فقط لتنفيذ طلبك وبموافقتك عند الاقتضاء. النص الألماني أدناه هو المرجع.',
  versand: 'الشحن عبر DHL من هامبورغ. طرق الدفع: PayPal، التحويل البنكي المسبق، أو الدفع عند الاستلام داخل ألمانيا.',
};
const AR_TITLE = { impressum: 'البيانات القانونية', agb: 'الشروط العامة', widerruf: 'حق العدول', datenschutz: 'سياسة الخصوصية', versand: 'الشحن والدفع' };

export function legalDoc(kind, lang, settings) {
  if (lang === 'en') return { ...EN[kind](settings), updated: LEGAL_UPDATED, sourceLang: 'en' };
  const doc = DE[kind](settings);
  if (lang === 'ar') return { title: AR_TITLE[kind], arNote: AR_NOTE[kind], sections: doc.sections, updated: LEGAL_UPDATED, sourceLang: 'de' };
  return { ...doc, updated: LEGAL_UPDATED, sourceLang: 'de' };
}
