// Store admin in Arabic (default, right-to-left), French and English: dashboard, orders, products, categories
// and settings. Talks to /api/admin/*. Pages are addressed by the URL hash (#dashboard, #orders,
// #order-12…) so links and the back button work. The chosen language is remembered in localStorage.
(() => {
  const app = document.getElementById('app');

  const I18N = {
    en: {
      locale: 'en-GB',
      status: { new: 'New', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' },
      nav: { dashboard: 'Dashboard', orders: 'Orders', products: 'Products', categories: 'Categories', blog: 'Blog', settings: 'Settings' },
      navShort: { dashboard: 'Home', orders: 'Orders', categories: 'Categories', settings: 'Settings' },
      blog: {
        postTitle: 'Title', date: 'Date', newPost: 'New post', editPost: 'Edit post',
        count: (n) => (n === 1 ? '1 post' : `${n} posts`),
        noPosts: 'No posts yet. Write the first one to bring in visitors from Google.',
        excerpt: 'Short summary', excerptHint: 'One or two sentences shown in Google and in the post list (300 characters max). Use the words your customers search for.',
        cover: 'Cover photo', coverHint: 'Shown at the top of the post and when it is shared on WhatsApp or Facebook.', uploadCover: 'Upload a photo', coverLink: 'Or an image link',
        body: 'Post text', published: 'Published on the site', saved: 'Post saved', deleted: 'Post deleted', confirmDelete: 'Delete this post?',
      },
      seo: 'Google (search)', seoHint: 'The sitemap is published automatically at /sitemap.xml, with your current products, categories and posts. To connect the store to Google Search Console, paste the verification code here.',
      googleVerify: 'Google Search Console verification code', googleHow: 'In Search Console, choose “URL prefix”, then the “HTML tag” method, and copy the whole tag or just the content value.',
      viewStore: 'View store',
      logout: 'Log out',
      logoutAsk: 'Log out of the seller space?',
      sellerSpace: 'Seller space',
      loginHint: 'Sign in to manage your orders.',
      password: 'Password',
      signIn: 'Sign in',
      errors: {
        wrong_password: 'Wrong password.',
        locked: 'Too many failed attempts. Sign-in from this device is blocked for a while, try again later.',
        bad_origin: 'Request refused.',
        slug_taken: 'This address (slug) is already used.',
        name_required: 'Add at least one name.',
        title_required: 'Add at least one title.',
        price_required: 'Enter a price.',
        not_enough_stock: 'Not enough stock to reopen this order.',
        bad_shipping_rates: 'Rates by city: invalid format.',
        no_r2: 'Photo storage (R2) is not set up.',
        too_large: 'Photo too large (5 MB max).',
        video_too_large: 'Video too large (5 MB max).',
        bad_type: 'Photo format not supported.',
        bot: 'Tick the check box, then try again.',
        no_ai_key: 'The Claude key (ANTHROPIC_API_KEY) is not installed in Cloudflare.', ai_bad_key: 'The Claude key is not valid.', ai_busy: 'Claude is busy, try again in a minute.', ai_failed: 'The description could not be written, try again.', ai_refused: 'Claude declined to write about this product.', ai_needs_input: 'Add a name, notes or photos first.',
        no_email_key: 'The Brevo key is not installed yet (see the steps below).',
        no_email_from: 'Enter the sender address (verified in Brevo).',
        no_notify_email: 'Enter the address that receives the alerts.',
        email_failed: 'Brevo refused to send.',
        generic: 'Error',
      },
      ago: { now: 'just now', min: (n) => `${n} min ago`, hour: (n) => `${n} h ago`, day: (n) => `${n} d ago` },
      hello: ['Good morning', 'Good afternoon', 'Good evening'],
      pending: (n) => `${n} order${n > 1 ? 's' : ''} to confirm.`,
      pendingHint: 'Ready to prepare and ship.',
      sales30: 'Sales · 30 days',
      orders30: 'Orders · 30 d',
      today: 'Today',
      aov: 'Average order',
      excludingCancelled: 'excluding cancelled',
      collected30: 'Collected · 30 d',
      deliveredOrders: 'orders delivered',
      deliveredRate: (n) => `${n} % delivered of closed orders`,
      isNew: 'New',
      salesPerDay: 'Sales per day',
      last30dh: 'Last 30 days, in €',
      days30: '30 days',
      salesChartLabel: 'Sales per day over 30 days',
      ordersN: (n) => `${n} order${n > 1 ? 's' : ''}`,
      pipeline: 'Order pipeline',
      noOrdersMonth: 'No orders yet this month.',
      cities: 'Cities',
      ordersShort30: 'orders, 30 d',
      nothingYet: 'Nothing to show yet.',
      bestSellers: 'Best sellers',
      bestSellersEmpty: 'Your best-selling products will appear here.',
      latestOrders: 'Latest orders',
      seeAll: 'See all',
      noOrdersYet: 'No orders yet. Share your store link!',
      lowStock: 'Low stock',
      left: (n) => `${n} left`,
      soldOut: 'Sold out',
      emails: 'Automatic emails',
      emailsOn: 'On',
      emailsOff: 'To set up',
      emailsOnText: (to) => `Confirmation to the customer and an alert to <strong>${to}</strong> for every order.`,
      emailsOffText: 'Send your customers a confirmation and get an alert for every order.',
      emailSettings: 'Email settings',
      setUp: 'Set up in 5 minutes',
      exportCsv: 'Export CSV',
      total: (n) => `${n} in total`,
      all: 'All',
      searchOrders: 'No., name, phone, city',
      thOrder: 'Order', thCustomer: 'Customer', thCity: 'City', thTotal: 'Total', thStatus: 'Status',
      noMatch: 'No orders match.',
      orderAt: 'Order',
      language: 'Language',
      phone: 'Phone', email: 'Email', city: 'City', address: 'Address', note: 'Note',
      call: 'Call',
      delivery: 'Delivery', free: 'Free', toCollect: 'To collect',
      adminNote: 'Internal note', adminNoteHint: 'Only visible to you',
      changeStatus: 'Change status',
      statusEmailHint: 'The customer gets an email when the order moves to Confirmed, Shipped, Delivered or Cancelled.',
      updated: 'Order updated',
      updatedEmailed: 'Order updated · email sent to the customer',
      noteSaved: 'Note saved',
      close: 'Close',
      thProduct: 'Product', thCategory: 'Category', thPrice: 'Price', thStock: 'Stock', thState: 'State',
      home: '★ Home', online: 'Online', hidden: 'Hidden',
      noProducts: 'No products. Add the first one.',
      nProducts: (n) => `${n} product${n > 1 ? 's' : ''}`,
      add: 'Add',
      editProduct: 'Edit product', newProduct: 'New product',
      name: 'Name', priceStock: 'Price and stock',
      price: 'Price (€)', comparePrice: 'Old price (crossed out, optional)', stock: 'Stock (empty = unlimited)', category: 'Category',
      options: 'Options (colours, sizes…)',
      opt: {
        hint: 'Add what the customer picks before ordering: colour, size, capacity… Their choice appears in the order and the emails.',
        color: 'Colour', size: 'Size', other: 'Other option',
        colorName: 'Colour', sizeName: 'Size',
        groupName: 'Option name', type: 'Type', typeText: 'Text buttons', typeColor: 'Colours',
        value: 'Value', valuePh: 'e.g. Red, XL, 128 GB', extra: 'Price difference (€)', addValue: 'Add a value', removeGroup: 'Remove this option',
        needValue: 'Add at least one value to each option, or remove it.',
      },
      offers: 'Quantity offers (e.g. 2 for €30)',
      bun: {
        hint: 'Shown as cards to pick on the product page: 1 piece at the normal price, then your offers. The price is for all the pieces together; the saving is worked out for you.',
        qty: 'Pieces', price: 'Bundle price (€)', title: 'Card title (optional)', titlePh: 'e.g. 2 for €30', hot: 'Most popular 🔥',
        add: 'Add an offer', save: (x) => `Save ${x}`, notCheaper: 'Not cheaper than the normal price: it will not be shown',
        bad: 'Each offer needs 2 to 20 pieces and a price, with a number of pieces different from the other offers.',
        left: 'Pieces left (this product)', leftHint: 'Shows “Only 7 pieces left in the 2-piece offer” and goes down with each order. Empty = the number from the settings, 0 = hidden.',
      },
      photos: 'Photos', addPhotos: 'Choose photos', takePhoto: 'Take a photo',
      dropHere: 'Drag your photos here or choose them on your device', dropHint: 'JPG, PNG, WEBP… shrunk automatically before upload. The first photo is the main photo.',
      mainPhoto: 'Main', moveBefore: 'Move earlier', moveAfter: 'Move later', pasteLinks: 'Or paste image links',
      uploadFailed: (n) => `Upload of ${n} failed`, notImage: (n) => `${n} is not a supported image`, waitUploads: 'Wait for the photos to finish uploading.',
      photoLinks: 'Photo links (one per line)', remove: 'Remove',
      description: 'Description', display: 'Display',
      gifTooBig: (n, mb) => `The GIF ${n} is over ${mb} MB.`,
      ai: {
        title: 'Write the description with AI', hint: 'Claude looks at the product photos and your notes and writes a selling description: a strong promise, the problem it solves, benefits, how to use it, what is in the box and the offer.',
        notes: 'What you know about the product', notesPh: 'E.g. 4 stainless steel bowls, 2 L, heats in 10 min, 220 V, in the box: cable and manual…',
        style: 'Arabic style', darija: 'Moroccan Darija', fusha: 'Standard Arabic', alsoNames: 'Also suggest the product name',
        go: 'Write the description', working: 'Writing… (up to 1 min)', done: 'Description ready. Check it before saving.',
        review: 'Only your notes and what the photos show are used. Check the numbers before saving.',
        replace: 'The current description will be replaced. Continue?',
        noKey: 'This needs the Claude key (ANTHROPIC_API_KEY) in Cloudflare.',
      },
      rte: {
        hint: 'Write like in Word. Add photos, GIFs and videos with the buttons, or drag / paste them into the text. Click a photo or video to change its size or alignment or delete it, or pull one of its sides or corners.',
        placeholder: 'Write the product description…', undo: 'Undo', redo: 'Redo', p: 'Normal text', h2: 'Large heading', h3: 'Small heading', quote: 'Quote',
        bold: 'Bold', italic: 'Italic', underline: 'Underline', strike: 'Strikethrough', color: 'Text colour', highlight: 'Highlight',
        ul: 'Bulleted list', ol: 'Numbered list', left: 'Align left', center: 'Center', right: 'Align right',
        link: 'Add a link', unlink: 'Remove link', photo: 'Photo or GIF', video: 'Video (MP4, MOV, WebM)', embed: 'From a link: YouTube, Vimeo, image or video',
        hr: 'Divider line', clear: 'Clear formatting', linkPrompt: 'Paste the link (https://…)', embedPrompt: 'Paste a YouTube or Vimeo link, or the link of an image or video (https://…)',
        badLink: 'Invalid link. It must start with https://', size: 'Size', smaller: 'Smaller', bigger: 'Bigger', dragSize: 'Drag to change the size or shape', resetShape: 'Original size and shape', alignL: 'Left', alignC: 'Center', alignR: 'Right', del: 'Delete',
      },
      videoTooBig: (n) => `The video ${n} is over 5 MB. Make it smaller and try again.`, photoTooBig: (n) => `The photo ${n} is over 1 MB.`,
      notMedia: (n) => `${n} is not a supported photo or video`,
      slug: 'Page address (slug)', auto: 'automatic', sort: 'Display order',
      featured: 'Feature on the home page', active: 'Online (visible in the store)',
      cancel: 'Cancel', view: 'View', del: 'Delete', save: 'Save',
      confirmDeleteProduct: 'Delete this product? Past orders are kept.',
      productDeleted: 'Product deleted', productSaved: 'Product saved',
      uploading: (n) => `Uploading ${n}…`,
      catsSub: 'The aisles of your store',
      catCoverHint: 'The cover photo shows on the category card on the home page and at the top of the category page. A portrait photo (4:5) looks best.', catUpload: 'Add a cover photo', catChange: 'Change photo', catRemove: 'Remove photo', catLink: 'Or an image link', thPhoto: 'Photo', thPhotoLink: 'Photo link', thSort: 'Order', thProducts: 'Products',
      newCategory: 'New category', ok: 'OK',
      catSaved: 'Category saved',
      confirmDeleteCat: 'Delete this category? Its products stay online, without a category.',
      store: 'Store', storeName: 'Store name', whatsapp: 'WhatsApp number (e.g. 4917612345678)', contactEmail: 'Contact email (customers reply to it)',
      emailsIntro: 'For every order, the customer gets a confirmation in their language (if they gave their email) and you get an alert. The customer is also told when their order is confirmed, shipped, delivered or cancelled.',
      keyOk: 'Brevo key installed', keyMissing: 'Brevo key missing',
      emailFrom: 'Sender address (verified in Brevo)', notifyEmail: 'Send order alerts to',
      statusUpdates: 'Tell the customer at every status change',
      currency: 'Currency', autoCurrency: 'Show prices in the visitor’s country currency (euro, dollar, pound…)',
      urgency: 'Urgency on the product page',
      urgencyHint: 'A countdown at the top of every product with an offer: each visitor gets 24 hours from their first visit, then it starts again. And the line “Only X pieces left in the offer” above the offers, which goes down by itself with each order.',
      countdownOn: 'Show the countdown “The offer ends in…” (24 h)',
      offerLeftAll: 'Pieces left in the offer (all products)', offerLeftAllHint: 'e.g. 7. Leave empty to hide the line. Can be changed for each product.',
      currencyHint: 'The customer always pays in euros: converted prices are a guide, with rates updated every 12 hours. Orders and the admin stay in euros.',
      weakPassword: 'The admin password is short. Use at least 12 characters (npx wrangler secret put ADMIN_PASSWORD).',
      social: 'Social networks',
      socialHint: 'Paste the page link or just the account name (e.g. @khachija). The icons show at the bottom of the store.',
      pixels: 'Ad pixels',
      pixelsHint: 'Paste only the ID, not the full code. No pixel loads until the visitor accepts cookies.',
      security: 'Bot protection', securityHint: 'Cloudflare Turnstile: an invisible check that a person, not a bot, is ordering or signing in to the admin. Most visitors see nothing.', turnstileKey: 'Turnstile site key', turnstileOn: '✓ On: orders and sign-in are protected.', turnstileHow: 'In Cloudflare: Turnstile → Add widget → khachija-shop.de. Paste the Site key here, and add the Secret key under Workers → khachija → Settings → Variables and Secrets as TURNSTILE_SECRET (type Secret).',
      adsenseHint: 'Google ads show only in blog articles, never on shop or order pages. They load after the article, so the site stays fast.', adsenseId: 'Publisher ID', adsenseHow: 'In AdSense: Account → Account information → Publisher ID (starts with pub-). The ads.txt file is added for you.',
      metaPixel: 'Meta Pixel ID (Facebook and Instagram)',
      metaHow: 'Facebook: Meta Events Manager → Data sources → your pixel → the 15 or 16 digit ID (Dataset ID).',
      tiktokPixel: 'TikTok Pixel ID',
      tiktokHow: 'TikTok: TikTok Ads Manager → Tools → Events → Web Events → your pixel → the ID (e.g. C4ABC…).',
      legal: 'Legal information',
      legalHint: 'Shown in the privacy policy and terms of sale. These texts are a draft: have an accountant or lawyer review them.',
      legalName: 'Company or personal name',
      legalIce: 'Tax number',
      legalRc: 'Commercial register no.',
      legalAddress: 'Address',
      legalCndp: 'Other register no. (if any)',
      viewPages: 'See the pages:',
      legalPrivacy: 'Privacy',
      legalTerms: 'Terms of sale',
      sendTest: 'Send a test', howItWorks: 'How does it work?',
      steps: [
        'Create a free account on <a href="https://www.brevo.com" target="_blank" rel="noopener">brevo.com</a> (300 free emails a day).',
        'In Brevo, open <em>Senders, domains and dedicated IPs</em> and add your sender address (for example your Gmail). Click the verification link you receive.',
        'In Brevo, open <em>SMTP and API → API keys</em> and create a key. Do not share it with anyone.',
        'On your PC, in the store folder, run <code>npx wrangler secret put BREVO_API_KEY</code> and paste the key when asked.',
        'Enter the verified address below, save, then click “Send a test”.',
      ],
      shipping: 'Delivery', shippingIncluded: 'Free delivery to every city: it is included in the product prices.', shippingFee: 'Default delivery fee (€)', freeOver: 'Free delivery from (€, 0 = never)',
      rates: 'Rates by city (one line per city: City = price)',
      banner: 'Announcement bar', bannerHint: 'The message that scrolls at the top of every page.',
      homePage: 'Home page', homeHint: 'Leave empty to keep the default text.',
      heroTitle: 'Title', heroText: 'Subtitle',
      saveSettings: 'Save settings', settingsSaved: 'Settings saved',
      testSent: (to) => `Test email sent to ${to}`,
      fr: 'French', ar: 'Arabic', en: 'English', de: 'German',
    },
    de: {
      locale: 'de-DE',
      status: { new: 'Neu', confirmed: 'Bestätigt', shipped: 'Versendet', delivered: 'Zugestellt', cancelled: 'Storniert', returned: 'Retoure' },
      nav: { dashboard: 'Übersicht', orders: 'Bestellungen', products: 'Produkte', categories: 'Kategorien', blog: 'Magazin', settings: 'Einstellungen' },
      navShort: { dashboard: 'Start', orders: 'Bestellungen', categories: 'Kategorien', settings: 'Einstellungen' },
      blog: {
        postTitle: 'Titel', date: 'Datum', newPost: 'Neuer Beitrag', editPost: 'Beitrag bearbeiten',
        count: (n) => (n === 1 ? '1 Beitrag' : `${n} Beiträge`),
        noPosts: 'Noch keine Beiträge. Schreiben Sie den ersten, um Besucher über Google zu gewinnen.',
        excerpt: 'Kurze Zusammenfassung', excerptHint: 'Ein bis zwei Sätze, die bei Google und in der Beitragsliste erscheinen (max. 300 Zeichen). Verwenden Sie die Wörter, nach denen Ihre Kundinnen suchen.',
        cover: 'Titelbild', coverHint: 'Erscheint oben im Beitrag und beim Teilen auf WhatsApp oder Facebook.', uploadCover: 'Foto hochladen', coverLink: 'Oder ein Bild-Link',
        body: 'Text des Beitrags', published: 'Auf der Website veröffentlicht', saved: 'Beitrag gespeichert', deleted: 'Beitrag gelöscht', confirmDelete: 'Diesen Beitrag löschen?',
      },
      seo: 'Google (Suche)', seoHint: 'Die Sitemap wird automatisch unter /sitemap.xml veröffentlicht, mit Ihren aktuellen Produkten, Kategorien und Beiträgen. Um den Shop mit der Google Search Console zu verbinden, fügen Sie hier den Bestätigungscode ein.',
      googleVerify: 'Bestätigungscode der Google Search Console', googleHow: 'Wählen Sie in der Search Console „URL-Präfix“, dann die Methode „HTML-Tag“, und kopieren Sie das ganze Tag oder nur den content-Wert.',
      viewStore: 'Shop ansehen',
      logout: 'Abmelden',
      logoutAsk: 'Vom Verkäuferbereich abmelden?',
      sellerSpace: 'Verkäuferbereich',
      loginHint: 'Melden Sie sich an, um Ihre Bestellungen zu verwalten.',
      password: 'Passwort',
      signIn: 'Anmelden',
      errors: {
        wrong_password: 'Falsches Passwort.',
        locked: 'Zu viele Fehlversuche. Die Anmeldung von diesem Gerät ist eine Weile gesperrt, bitte später erneut versuchen.',
        bad_origin: 'Anfrage abgelehnt.',
        slug_taken: 'Diese Adresse (Slug) wird bereits verwendet.',
        name_required: 'Geben Sie mindestens einen Namen ein.',
        title_required: 'Geben Sie mindestens einen Titel ein.',
        price_required: 'Geben Sie einen Preis ein.',
        not_enough_stock: 'Nicht genug Bestand, um diese Bestellung wieder zu öffnen.',
        bad_shipping_rates: 'Versandpreise: ungültiges Format.',
        no_r2: 'Der Foto-Speicher (R2) ist nicht eingerichtet.',
        too_large: 'Foto zu groß (max. 5 MB).',
        video_too_large: 'Video zu groß (max. 5 MB).',
        bad_type: 'Fotoformat wird nicht unterstützt.',
        bot: 'Setzen Sie das Häkchen und versuchen Sie es erneut.',
        no_ai_key: 'Der Claude-Schlüssel (ANTHROPIC_API_KEY) ist in Cloudflare nicht hinterlegt.', ai_bad_key: 'Der Claude-Schlüssel ist ungültig.', ai_busy: 'Claude ist gerade ausgelastet, bitte in einer Minute erneut versuchen.', ai_failed: 'Die Beschreibung konnte nicht geschrieben werden, bitte erneut versuchen.', ai_refused: 'Claude möchte über dieses Produkt nicht schreiben.', ai_needs_input: 'Fügen Sie zuerst einen Namen, Notizen oder Fotos hinzu.',
        no_email_key: 'Der Brevo-Schlüssel ist noch nicht hinterlegt (siehe Schritte unten).',
        no_email_from: 'Geben Sie die Absenderadresse ein (in Brevo bestätigt).',
        no_notify_email: 'Geben Sie die Adresse ein, die die Benachrichtigungen erhält.',
        email_failed: 'Brevo hat den Versand abgelehnt.',
        generic: 'Fehler',
      },
      ago: { now: 'gerade eben', min: (n) => `vor ${n} Min.`, hour: (n) => `vor ${n} Std.`, day: (n) => `vor ${n} T.` },
      hello: ['Guten Morgen', 'Guten Tag', 'Guten Abend'],
      pending: (n) => (n === 1 ? '1 Bestellung zu bestätigen.' : `${n} Bestellungen zu bestätigen.`),
      pendingHint: 'Bereit zum Packen und Versenden.',
      sales30: 'Umsatz · 30 Tage',
      orders30: 'Bestellungen · 30 T.',
      today: 'Heute',
      aov: 'Ø Bestellwert',
      excludingCancelled: 'ohne Stornierungen',
      collected30: 'Eingenommen · 30 T.',
      deliveredOrders: 'Bestellungen zugestellt',
      deliveredRate: (n) => `${n} % der abgeschlossenen Bestellungen zugestellt`,
      isNew: 'Neu',
      salesPerDay: 'Umsatz pro Tag',
      last30dh: 'Letzte 30 Tage, in €',
      days30: '30 Tage',
      salesChartLabel: 'Umsatz pro Tag über 30 Tage',
      ordersN: (n) => (n === 1 ? '1 Bestellung' : `${n} Bestellungen`),
      pipeline: 'Bestellstatus',
      noOrdersMonth: 'Diesen Monat noch keine Bestellungen.',
      cities: 'Städte',
      ordersShort30: 'Bestellungen, 30 T.',
      nothingYet: 'Noch nichts anzuzeigen.',
      bestSellers: 'Bestseller',
      bestSellersEmpty: 'Ihre meistverkauften Produkte erscheinen hier.',
      latestOrders: 'Neueste Bestellungen',
      seeAll: 'Alle ansehen',
      noOrdersYet: 'Noch keine Bestellungen. Teilen Sie den Link zu Ihrem Shop!',
      lowStock: 'Geringer Bestand',
      left: (n) => `noch ${n}`,
      soldOut: 'Ausverkauft',
      emails: 'Automatische E-Mails',
      emailsOn: 'Aktiv',
      emailsOff: 'Einzurichten',
      emailsOnText: (to) => `Bestätigung an die Kundin und eine Benachrichtigung an <strong>${to}</strong> bei jeder Bestellung.`,
      emailsOffText: 'Schicken Sie Ihren Kundinnen eine Bestätigung und erhalten Sie bei jeder Bestellung eine Benachrichtigung.',
      emailSettings: 'E-Mail-Einstellungen',
      setUp: 'In 5 Minuten einrichten',
      exportCsv: 'CSV exportieren',
      total: (n) => `${n} insgesamt`,
      all: 'Alle',
      searchOrders: 'Nr., Name, Telefon, Stadt',
      thOrder: 'Bestellung', thCustomer: 'Kundin', thCity: 'Stadt', thTotal: 'Summe', thStatus: 'Status',
      noMatch: 'Keine passenden Bestellungen.',
      orderAt: 'Bestellung',
      language: 'Sprache',
      phone: 'Telefon', email: 'E-Mail', city: 'Stadt', address: 'Adresse', note: 'Notiz',
      call: 'Anrufen',
      delivery: 'Versand', free: 'Kostenlos', toCollect: 'Zu kassieren',
      adminNote: 'Interne Notiz', adminNoteHint: 'Nur für Sie sichtbar',
      changeStatus: 'Status ändern',
      statusEmailHint: 'Die Kundin erhält eine E-Mail, wenn die Bestellung auf Bestätigt, Versendet, Zugestellt oder Storniert wechselt.',
      updated: 'Bestellung aktualisiert',
      updatedEmailed: 'Bestellung aktualisiert · E-Mail an die Kundin gesendet',
      noteSaved: 'Notiz gespeichert',
      close: 'Schließen',
      thProduct: 'Produkt', thCategory: 'Kategorie', thPrice: 'Preis', thStock: 'Bestand', thState: 'Status',
      home: '★ Startseite', online: 'Online', hidden: 'Ausgeblendet',
      noProducts: 'Keine Produkte. Fügen Sie das erste hinzu.',
      nProducts: (n) => (n === 1 ? '1 Produkt' : `${n} Produkte`),
      add: 'Hinzufügen',
      editProduct: 'Produkt bearbeiten', newProduct: 'Neues Produkt',
      name: 'Name', priceStock: 'Preis und Bestand',
      price: 'Preis (€)', comparePrice: 'Alter Preis (durchgestrichen, optional)', stock: 'Bestand (leer = unbegrenzt)', category: 'Kategorie',
      options: 'Varianten (Farben, Größen…)',
      opt: {
        hint: 'Fügen Sie hinzu, was die Kundin vor der Bestellung auswählt: Farbe, Größe, Inhalt… Ihre Auswahl erscheint in der Bestellung und in den E-Mails.',
        color: 'Farbe', size: 'Größe', other: 'Andere Variante',
        colorName: 'Farbe', sizeName: 'Größe',
        groupName: 'Name der Variante', type: 'Typ', typeText: 'Text-Buttons', typeColor: 'Farben',
        value: 'Wert', valuePh: 'z. B. Rot, 100 ml, 250 g', extra: 'Preisunterschied (€)', addValue: 'Wert hinzufügen', removeGroup: 'Diese Variante entfernen',
        needValue: 'Geben Sie jeder Variante mindestens einen Wert, oder entfernen Sie sie.',
      },
      offers: 'Mengenangebote (z. B. 2 für 30 €)',
      bun: {
        hint: 'Erscheinen als Auswahlkarten auf der Produktseite: 1 Stück zum normalen Preis, dann Ihre Angebote. Der Preis gilt für alle Stücke zusammen; die Ersparnis wird automatisch berechnet.',
        qty: 'Stück', price: 'Paketpreis (€)', title: 'Titel der Karte (optional)', titlePh: 'z. B. 2 für 30 €', hot: 'Am beliebtesten 🔥',
        add: 'Angebot hinzufügen', save: (x) => `${x} sparen`, notCheaper: 'Nicht günstiger als der normale Preis: wird nicht angezeigt',
        bad: 'Jedes Angebot braucht 2 bis 20 Stück und einen Preis, mit einer anderen Stückzahl als die übrigen Angebote.',
        left: 'Verbleibende Stück (dieses Produkt)', leftHint: 'Zeigt „Nur noch 7 Stück im 2er-Angebot“ und zählt mit jeder Bestellung herunter. Leer = Zahl aus den Einstellungen, 0 = ausgeblendet.',
      },
      photos: 'Fotos', addPhotos: 'Fotos auswählen', takePhoto: 'Foto aufnehmen',
      dropHere: 'Ziehen Sie Ihre Fotos hierher oder wählen Sie sie auf Ihrem Gerät aus', dropHint: 'JPG, PNG, WEBP… werden vor dem Hochladen automatisch verkleinert. Das erste Foto ist das Hauptfoto.',
      mainPhoto: 'Haupt', moveBefore: 'Nach vorne', moveAfter: 'Nach hinten', pasteLinks: 'Oder Bild-Links einfügen',
      uploadFailed: (n) => `Hochladen von ${n} fehlgeschlagen`, notImage: (n) => `${n} ist kein unterstütztes Bild`, waitUploads: 'Warten Sie, bis die Fotos hochgeladen sind.',
      photoLinks: 'Foto-Links (einer pro Zeile)', remove: 'Entfernen',
      description: 'Beschreibung', display: 'Anzeige',
      gifTooBig: (n, mb) => `Das GIF ${n} ist größer als ${mb} MB.`,
      ai: {
        title: 'Beschreibung mit KI schreiben', hint: 'Claude sieht sich die Produktfotos und Ihre Notizen an und schreibt eine verkaufsstarke Beschreibung: ein klares Versprechen, das Problem, das das Produkt löst, die Vorteile, die Anwendung, den Inhalt und das Angebot.',
        notes: 'Was Sie über das Produkt wissen', notesPh: 'z. B. 250 g, für Gesicht und Körper, mit Eukalyptus, nach dem Hammam auftragen…',
        style: 'Arabischer Stil', darija: 'Marokkanisches Darija', fusha: 'Hocharabisch', alsoNames: 'Auch einen Produktnamen vorschlagen',
        go: 'Beschreibung schreiben', working: 'Wird geschrieben… (bis zu 1 Min.)', done: 'Beschreibung fertig. Bitte vor dem Speichern prüfen.',
        review: 'Es werden nur Ihre Notizen und das, was auf den Fotos zu sehen ist, verwendet. Prüfen Sie die Angaben vor dem Speichern.',
        replace: 'Die aktuelle Beschreibung wird ersetzt. Fortfahren?',
        noKey: 'Dafür wird der Claude-Schlüssel (ANTHROPIC_API_KEY) in Cloudflare benötigt.',
      },
      rte: {
        hint: 'Schreiben Sie wie in Word. Fügen Sie Fotos, GIFs und Videos mit den Buttons hinzu oder ziehen bzw. kopieren Sie sie in den Text. Klicken Sie auf ein Foto oder Video, um Größe oder Ausrichtung zu ändern oder es zu löschen, oder ziehen Sie an einer Seite oder Ecke.',
        placeholder: 'Produktbeschreibung schreiben…', undo: 'Rückgängig', redo: 'Wiederholen', p: 'Normaler Text', h2: 'Große Überschrift', h3: 'Kleine Überschrift', quote: 'Zitat',
        bold: 'Fett', italic: 'Kursiv', underline: 'Unterstrichen', strike: 'Durchgestrichen', color: 'Textfarbe', highlight: 'Hervorheben',
        ul: 'Aufzählung', ol: 'Nummerierte Liste', left: 'Linksbündig', center: 'Zentriert', right: 'Rechtsbündig',
        link: 'Link hinzufügen', unlink: 'Link entfernen', photo: 'Foto oder GIF', video: 'Video (MP4, MOV, WebM)', embed: 'Über einen Link: YouTube, Vimeo, Bild oder Video',
        hr: 'Trennlinie', clear: 'Formatierung entfernen', linkPrompt: 'Link einfügen (https://…)', embedPrompt: 'Fügen Sie einen YouTube- oder Vimeo-Link oder den Link eines Bildes oder Videos ein (https://…)',
        badLink: 'Ungültiger Link. Er muss mit https:// beginnen', size: 'Größe', smaller: 'Kleiner', bigger: 'Größer', dragSize: 'Ziehen, um Größe oder Form zu ändern', resetShape: 'Originalgröße und -form', alignL: 'Links', alignC: 'Mitte', alignR: 'Rechts', del: 'Löschen',
      },
      videoTooBig: (n) => `Das Video ${n} ist größer als 5 MB. Bitte verkleinern und erneut versuchen.`, photoTooBig: (n) => `Das Foto ${n} ist größer als 1 MB.`,
      notMedia: (n) => `${n} ist kein unterstütztes Foto oder Video`,
      slug: 'Seitenadresse (Slug)', auto: 'automatisch', sort: 'Reihenfolge',
      featured: 'Auf der Startseite zeigen', active: 'Online (im Shop sichtbar)',
      cancel: 'Abbrechen', view: 'Ansehen', del: 'Löschen', save: 'Speichern',
      confirmDeleteProduct: 'Dieses Produkt löschen? Frühere Bestellungen bleiben erhalten.',
      productDeleted: 'Produkt gelöscht', productSaved: 'Produkt gespeichert',
      uploading: (n) => `${n} wird hochgeladen…`,
      catsSub: 'Die Regale Ihres Shops',
      catCoverHint: 'Das Titelbild erscheint auf der Kategorie-Karte der Startseite und oben auf der Kategorieseite. Ein Hochformat (4:5) wirkt am besten.', catUpload: 'Titelbild hinzufügen', catChange: 'Foto ändern', catRemove: 'Foto entfernen', catLink: 'Oder ein Bild-Link', thPhoto: 'Foto', thPhotoLink: 'Foto-Link', thSort: 'Reihenfolge', thProducts: 'Produkte',
      newCategory: 'Neue Kategorie', ok: 'OK',
      catSaved: 'Kategorie gespeichert',
      confirmDeleteCat: 'Diese Kategorie löschen? Ihre Produkte bleiben online, ohne Kategorie.',
      store: 'Shop', storeName: 'Name des Shops', whatsapp: 'WhatsApp-Nummer (z. B. 4917612345678)', contactEmail: 'Kontakt-E-Mail (Kundinnen antworten an diese Adresse)',
      emailsIntro: 'Bei jeder Bestellung erhält die Kundin eine Bestätigung in ihrer Sprache (wenn sie ihre E-Mail angegeben hat) und Sie eine Benachrichtigung. Die Kundin wird auch informiert, wenn ihre Bestellung bestätigt, versendet, zugestellt oder storniert wird.',
      keyOk: 'Brevo-Schlüssel hinterlegt', keyMissing: 'Brevo-Schlüssel fehlt',
      emailFrom: 'Absenderadresse (in Brevo bestätigt)', notifyEmail: 'Bestellbenachrichtigungen senden an',
      statusUpdates: 'Die Kundin bei jeder Statusänderung informieren',
      currency: 'Währung', autoCurrency: 'Preise in der Währung des Besucherlandes zeigen (Euro, Dollar, Pfund…)',
      urgency: 'Dringlichkeit auf der Produktseite',
      urgencyHint: 'Ein Countdown oben bei jedem Produkt mit Angebot: Jede Besucherin hat 24 Stunden ab ihrem ersten Besuch, dann beginnt er neu. Und die Zeile „Nur noch X Stück im Angebot“ über den Angeboten, die mit jeder Bestellung von selbst herunterzählt.',
      countdownOn: 'Countdown „Das Angebot endet in…“ zeigen (24 Std.)',
      offerLeftAll: 'Verbleibende Stück im Angebot (alle Produkte)', offerLeftAllHint: 'z. B. 7. Leer lassen, um die Zeile auszublenden. Kann pro Produkt geändert werden.',
      currencyHint: 'Die Kundin bezahlt immer in Euro: umgerechnete Preise sind nur eine Orientierung, die Kurse werden alle 12 Stunden aktualisiert. Bestellungen und Verwaltung bleiben in Euro.',
      weakPassword: 'Das Admin-Passwort ist kurz. Verwenden Sie mindestens 12 Zeichen (npx wrangler secret put ADMIN_PASSWORD).',
      social: 'Soziale Netzwerke',
      socialHint: 'Fügen Sie den Link zur Seite oder nur den Kontonamen ein (z. B. @khachija). Die Symbole erscheinen unten im Shop.',
      pixels: 'Werbe-Pixel',
      pixelsHint: 'Fügen Sie nur die ID ein, nicht den ganzen Code. Kein Pixel lädt, bevor die Besucherin Cookies akzeptiert.',
      security: 'Bot-Schutz', securityHint: 'Cloudflare Turnstile: eine unsichtbare Prüfung, dass ein Mensch und kein Bot bestellt oder sich im Admin anmeldet. Die meisten Besucher bemerken nichts.', turnstileKey: 'Turnstile Site Key', turnstileOn: '✓ Aktiv: Bestellungen und Anmeldung sind geschützt.', turnstileHow: 'In Cloudflare: Turnstile → Add widget → khachija-shop.de. Fügen Sie den Site Key hier ein und den Secret Key unter Workers → khachija → Settings → Variables and Secrets als TURNSTILE_SECRET (Typ Secret).',
      adsenseHint: 'Google-Anzeigen erscheinen nur in Magazin-Artikeln, nie auf Shop- oder Bestellseiten. Sie laden nach dem Artikel, damit die Website schnell bleibt.', adsenseId: 'Publisher-ID', adsenseHow: 'In AdSense: Konto → Kontoinformationen → Publisher-ID (beginnt mit pub-). Die Datei ads.txt wird automatisch hinzugefügt.',
      metaPixel: 'Meta-Pixel-ID (Facebook und Instagram)',
      metaHow: 'Facebook: Meta Events Manager → Datenquellen → Ihr Pixel → die 15- oder 16-stellige ID (Dataset-ID).',
      tiktokPixel: 'TikTok-Pixel-ID',
      tiktokHow: 'TikTok: TikTok Ads Manager → Tools → Events → Web Events → Ihr Pixel → die ID (z. B. C4ABC…).',
      legal: 'Rechtliche Angaben',
      legalHint: 'Erscheinen in der Datenschutzerklärung und den AGB. Diese Texte sind ein Entwurf: Lassen Sie sie von einer Steuerberaterin oder einem Anwalt prüfen.',
      legalName: 'Firmen- oder Personenname',
      legalIce: 'Steuernummer',
      legalRc: 'Handelsregister-Nr.',
      legalAddress: 'Adresse',
      legalCndp: 'Weitere Registernummer (falls vorhanden)',
      viewPages: 'Seiten ansehen:',
      legalPrivacy: 'Datenschutz',
      legalTerms: 'AGB',
      sendTest: 'Test senden', howItWorks: 'Wie funktioniert das?',
      steps: [
        'Erstellen Sie ein kostenloses Konto auf <a href="https://www.brevo.com" target="_blank" rel="noopener">brevo.com</a> (300 kostenlose E-Mails pro Tag).',
        'Öffnen Sie in Brevo <em>Absender, Domains und dedizierte IPs</em> und fügen Sie Ihre Absenderadresse hinzu (z. B. Ihre Gmail-Adresse). Klicken Sie auf den Bestätigungslink, den Sie erhalten.',
        'Öffnen Sie in Brevo <em>SMTP und API → API-Schlüssel</em> und erstellen Sie einen Schlüssel. Geben Sie ihn niemandem weiter.',
        'Führen Sie auf Ihrem PC im Shop-Ordner <code>npx wrangler secret put BREVO_API_KEY</code> aus und fügen Sie den Schlüssel ein, wenn Sie gefragt werden.',
        'Geben Sie unten die bestätigte Adresse ein, speichern Sie und klicken Sie auf „Test senden“.',
      ],
      shipping: 'Versand', shippingIncluded: 'Kostenloser Versand in jede Stadt: Er ist in den Produktpreisen enthalten.', shippingFee: 'Standard-Versandkosten (€)', freeOver: 'Kostenloser Versand ab (€, 0 = nie)',
      rates: 'Preise nach Stadt (eine Zeile pro Stadt: Stadt = Preis)',
      banner: 'Ankündigungsleiste', bannerHint: 'Die Nachricht, die oben auf jeder Seite läuft.',
      homePage: 'Startseite', homeHint: 'Leer lassen, um den Standardtext zu behalten.',
      heroTitle: 'Titel', heroText: 'Untertitel',
      saveSettings: 'Einstellungen speichern', settingsSaved: 'Einstellungen gespeichert',
      testSent: (to) => `Test-E-Mail an ${to} gesendet`,
      fr: 'Französisch', ar: 'Arabisch', en: 'Englisch', de: 'Deutsch',
    },
  };

  const savedLang = (() => {
    try {
      return localStorage.getItem('admin.lang');
    } catch {
      return null;
    }
  })();
  let lang = 'de';
  let L = I18N.de;
  function setLang(next) {
    lang = I18N[next] ? next : 'de';
    L = I18N[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr';
    document.title = `Khachija · ${L.sellerSpace}`;
    try {
      localStorage.setItem('admin.lang', lang);
    } catch {}
  }
  setLang(savedLang);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const num = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const colon = () => ': ';
  const dh = (c) => new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'de-DE', { style: 'currency', currency: 'EUR', numberingSystem: 'latn' }).format((Math.round(c) || 0) / 100);
  // Euros typed in a form ("16,90", "16.90") → number of euros; and cents → "16,90" for an input.
  const eur = (v) => { const n = Number(String(v ?? '').trim().replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const toInput = (c) => (c == null || c === '' ? '' : (Number(c) / 100).toFixed(2).replace('.', ','));
  const X = {
    en: { payment: 'Payment', payStatus: { pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' }, method: { paypal: 'PayPal', bank: 'Bank transfer', cod: 'Cash on delivery' }, markPaid: 'Mark as paid', markRefunded: 'Mark refunded', paidOk: 'Payment saved', tracking: 'Parcel tracking', carrier: 'Carrier', trackingNo: 'Tracking number', saveTracking: 'Save tracking', trackingSaved: 'Tracking saved', codFee: 'Cash-on-delivery fee', vat: 'incl. VAT', openPayments: 'Awaiting payment', awaiting: (b, p) => `${b} bank transfer(s) and ${p} PayPal awaiting payment`, events: 'History', subtitle: 'Subtitle (under the name)', usage: 'How to use', ingredients: 'Ingredients (INCI)', ingredientsHint: 'The ingredient list as printed on the pack (required for cosmetics).', unitAmount: 'Contents (for the price per litre/kilo)', unitType: 'Unit', priceEur: 'Price (€, incl. VAT)', compareEur: 'Old price (€, crossed out)', extraEur: 'Price difference (€)', bunEur: 'Bundle price (€)', pay: 'Payment methods', payHint: 'PayPal shows once the PAYPAL_CLIENT_ID and PAYPAL_SECRET secrets are added (Cloudflare → Variables and Secrets). Cash on delivery is offered in Germany only.', payPaypal: 'PayPal (also card, direct debit, Pay Later)', payBank: 'Bank transfer in advance (Vorkasse)', payCod: 'DHL cash on delivery (Nachnahme)', codFeeEur: 'Cash-on-delivery fee (€)', paypalMode: 'PayPal mode', sandbox: 'Test (sandbox)', live: 'Real (live)', paypalOn: 'PayPal keys installed', paypalOff: 'PayPal keys missing', bank: 'Bank account (shown after a bank-transfer order)', bankOwner: 'Account holder', iban: 'IBAN', bic: 'BIC', bankName: 'Bank', bankDays: 'Payment term (days)', ship: 'Shipping', shipFee: 'Germany (€)', freeOver: 'Free shipping from (€, 0 = never)', freeAll: 'Free shipping abroad too', rates: 'Other countries (€), one per line: AT=9,90', deliveryDays: 'Delivery time (working days, e.g. 2-4)', vatTitle: 'VAT', vatMode: 'Status', vatSmall: 'Small business (§ 19 UStG, no VAT)', vatIncl: 'VAT included in prices', vatRate: 'Rate (%)', legalDe: 'Legal details (Impressum, terms, withdrawal)', legalCompany: 'Trading name', legalOwner: 'Owner’s name', legalAddress: 'Address', legalVat: 'VAT ID (USt-IdNr.), if you have one', legalRegister: 'Commercial register (if registered)', phoneLabel: 'Phone shown on the site', founderPhoto: 'Photo of Khadija (link, About page)', subscribers: (n) => `${n} newsletter subscriber(s)`, exportSubs: 'Export newsletter' },
    de: { payment: 'Zahlung', payStatus: { pending: 'Offen', paid: 'Bezahlt', failed: 'Fehlgeschlagen', refunded: 'Erstattet' }, method: { paypal: 'PayPal', bank: 'Überweisung', cod: 'Nachnahme' }, markPaid: 'Als bezahlt markieren', markRefunded: 'Als erstattet markieren', paidOk: 'Zahlung gespeichert', tracking: 'Sendungsverfolgung', carrier: 'Versanddienst', trackingNo: 'Sendungsnummer', saveTracking: 'Sendungsnummer speichern', trackingSaved: 'Sendungsnummer gespeichert', codFee: 'Nachnahmegebühr', vat: 'inkl. MwSt.', openPayments: 'Offene Zahlungen', awaiting: (b, p) => `${b} Überweisung(en) und ${p} PayPal-Zahlung(en) offen`, events: 'Verlauf', subtitle: 'Untertitel (unter dem Namen)', usage: 'Anwendung', ingredients: 'Inhaltsstoffe (INCI)', ingredientsHint: 'Die Liste der Inhaltsstoffe wie auf der Verpackung gedruckt (für Kosmetik Pflicht).', unitAmount: 'Inhalt (für den Preis pro Liter/Kilo)', unitType: 'Einheit', priceEur: 'Preis (€, inkl. MwSt.)', compareEur: 'Alter Preis (€, durchgestrichen)', extraEur: 'Preisunterschied (€)', bunEur: 'Paketpreis (€)', pay: 'Zahlungsarten', payHint: 'PayPal erscheint, sobald die Secrets PAYPAL_CLIENT_ID und PAYPAL_SECRET hinterlegt sind (Cloudflare → Variables and Secrets). Nachnahme wird nur in Deutschland angeboten.', payPaypal: 'PayPal (auch Karte, Lastschrift, später bezahlen)', payBank: 'Vorkasse per Überweisung', payCod: 'DHL Nachnahme', codFeeEur: 'Nachnahmegebühr (€)', paypalMode: 'PayPal-Modus', sandbox: 'Test (Sandbox)', live: 'Echt (Live)', paypalOn: 'PayPal-Schlüssel hinterlegt', paypalOff: 'PayPal-Schlüssel fehlen', bank: 'Bankkonto (wird nach einer Bestellung per Überweisung angezeigt)', bankOwner: 'Kontoinhaberin', iban: 'IBAN', bic: 'BIC', bankName: 'Bank', bankDays: 'Zahlungsfrist (Tage)', ship: 'Versand', shipFee: 'Deutschland (€)', freeOver: 'Kostenloser Versand ab (€, 0 = nie)', freeAll: 'Kostenloser Versand auch ins Ausland', rates: 'Andere Länder (€), eines pro Zeile: AT=9,90', deliveryDays: 'Lieferzeit (Werktage, z. B. 2-4)', vatTitle: 'Umsatzsteuer', vatMode: 'Status', vatSmall: 'Kleinunternehmerin (§ 19 UStG, keine MwSt.)', vatIncl: 'MwSt. in den Preisen enthalten', vatRate: 'Satz (%)', legalDe: 'Rechtliches (Impressum, AGB, Widerruf)', legalCompany: 'Firmenname', legalOwner: 'Name der Inhaberin', legalAddress: 'Adresse', legalVat: 'USt-IdNr., falls vorhanden', legalRegister: 'Handelsregister (falls eingetragen)', phoneLabel: 'Angezeigte Telefonnummer', founderPhoto: 'Foto von Khadija (Link, Seite „Über uns“)', subscribers: (n) => `${n} Newsletter-Abonnent(en)`, exportSubs: 'Newsletter exportieren' },
  };
  X.en.tiers = 'DHL prices by parcel weight (one line per zone: DE and EU)';
  X.de.tiers = 'DHL-Preise nach Paketgewicht (eine Zeile pro Zone: DE und EU)';
  X.en.tiersHint = 'Format: kg=price, separated by ; e.g. DE: 2=5,19; 5=7,69; 10=10,49. The shop adds up the weight of the products (plus packaging) and picks the matching price. Free shipping from the amount above still applies in Germany.';
  X.de.tiersHint = 'Format: kg=Preis, getrennt durch ; z. B. DE: 2=5,19; 5=7,69; 10=10,49. Der Shop addiert das Gewicht der Produkte (plus Verpackung) und wählt den passenden Preis. Der kostenlose Versand ab dem Betrag oben gilt in Deutschland weiterhin.';
  X.en.legalWid = 'Business ID (W-IdNr., e.g. DE123456789-00001)';
  X.de.legalWid = 'Wirtschafts-Identifikationsnummer (W-IdNr.)';
  const XL = () => X[lang] || X.en;
  const date = (s) => new Date(`${s.replace(' ', 'T')}Z`);
  const when = (s) => date(s).toLocaleString(L.locale, { dateStyle: 'short', timeStyle: 'short', numberingSystem: 'latn' });
  const ago = (s) => {
    const min = Math.round((Date.now() - date(s)) / 60000);
    if (min < 1) return L.ago.now;
    if (min < 60) return L.ago.min(min);
    if (min < 1440) return L.ago.hour(Math.round(min / 60));
    return L.ago.day(Math.round(min / 1440));
  };
  const STATUS_KEYS = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
  const PAGES = ['dashboard', 'orders', 'products', 'categories', 'blog', 'settings'];
  const LANG_LABEL = { ar: 'العربية', de: 'Deutsch', en: 'English', fr: 'Français' };
  const dirOf = (l) => (l === 'ar' ? 'dir="rtl" lang="ar"' : `dir="ltr" lang="${l}"`);
  // Translations are entered with the admin's own language first.
  const contentLangs = () => ({ de: ['de', 'en', 'ar'], en: ['en', 'de', 'ar'] })[lang] || ['de', 'en', 'ar'];
  // A name in the admin's language, else the nearest other one.
  const pick = (x, k) => contentLangs().map((l) => x[`${k}_${l}`]).find(Boolean);
  let state = { page: 'dashboard', status: '', q: '', images: false, emails: false, settings: {}, categories: [] };

  // Line icons, 24×24, stroke = currentColor.
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
    orders: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    products: '<path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    blog: '<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5"/><path d="M8 12h8M8 16h8M8 8h3"/>',
    categories: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    camera: '<path d="M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    chevron: '<path d="m15 6-6 6 6 6"/>',
  };
  const icon = (n, s = 20) => `<svg class="i i-${n}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

  let toastTimer;
  function toast(text, bad) {
    const el = document.querySelector('.toast');
    el.textContent = text;
    el.className = `toast${bad ? ' bad' : ''}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3000);
  }

  async function api(path, { method = 'GET', body, raw } = {}) {
    const res = await fetch(`/api/admin${path}`, {
      method,
      // Writes always go out as JSON (DELETE too): the server refuses any other write.
      headers: raw ? { 'content-type': raw.type } : body || method !== 'GET' ? { 'content-type': 'application/json' } : {},
      body: raw || (body || method !== 'GET' ? JSON.stringify(body || {}) : undefined),
      credentials: 'same-origin',
    });
    if (res.status === 401 && path !== '/login') {
      login();
      throw new Error('unauthorized');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = L.errors[data.error] || data.error || `${L.errors.generic} ${res.status}`;
      throw new Error(data.error === 'email_failed' && data.detail ? `${msg} ${data.detail}` : msg);
    }
    return data;
  }

  // Language switcher: one button per admin language, the current one highlighted.
  const ADMIN_LANGS = [['de', 'DE'], ['en', 'EN']];
  const langButton = (cls = '') =>
    `<div class="lang-switch ${cls}" role="group" aria-label="${L.language}">${icon('globe', 18)}${ADMIN_LANGS.map(([l, t]) => `<button type="button" data-lang="${l}" lang="${l}" title="${LANG_LABEL[l]}" aria-pressed="${l === lang}"${l === lang ? ' class="on"' : ''}>${t}</button>`).join('')}</div>`;

  // Login
  // Cloudflare Turnstile on the login (when the shop has it set up): an invisible check that a
  // person is signing in, on top of the attempt limit. Its key comes from /login-config.
  let tsLogin = null;
  function loginTurnstile() {
    if (!tsLogin) {
      tsLogin = fetch('/api/admin/login-config', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((c) =>
          c.turnstile
            ? new Promise((resolve) => {
                window.__tsLoaded = () => resolve({ ts: window.turnstile, key: c.turnstile });
                const s = document.createElement('script');
                s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__tsLoaded';
                s.async = true;
                s.onerror = () => resolve(null);
                document.head.appendChild(s);
              })
            : null,
        )
        .catch(() => null);
    }
    return tsLogin;
  }
  async function loginToken(f) {
    const t = await loginTurnstile();
    const box = f.querySelector('.ts-box');
    if (!t || !box) return '';
    return new Promise((resolve) => {
      if (box.dataset.id) t.ts.remove(box.dataset.id);
      box.dataset.id = t.ts.render(box, { sitekey: t.key, appearance: 'interaction-only', theme: 'dark', size: 'flexible', callback: resolve, 'error-callback': () => resolve(''), 'expired-callback': () => resolve('') });
      setTimeout(() => resolve(''), 30000);
    });
  }

  function login() {
    loginTurnstile();
    document.body.className = 'is-login';
    const X = {
      de: { greet: ['Guten Morgen', 'Guten Tag', 'Guten Abend'], quote: '„Jedes Produkt trägt die Hände einer Frau aus der Kooperative und die Geschichte meines Dorfes.“', sign: 'Khadija Hakki · Hamburg', secure: 'Geschützte, verschlüsselte Anmeldung', back: 'Zurück zum Shop', show: 'Passwort anzeigen', caps: 'Feststelltaste ist aktiv' },
      en: { greet: ['Good morning', 'Good afternoon', 'Good evening'], quote: '“Every product carries the hands of a woman from the cooperative, and the story of my village.”', sign: 'Khadija Hakki · Hamburg', secure: 'Protected, encrypted sign-in', back: 'Back to the shop', show: 'Show password', caps: 'Caps Lock is on' },
    }[lang] || {};
    const h = new Date().getHours();
    const greet = X.greet[h < 12 ? 0 : h < 18 ? 1 : 2];
    const eye = '<svg class="eye-on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
    const lock = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    app.innerHTML = `<section class="lg-stage" aria-hidden="true">${calm ? '' : '<video autoplay muted loop playsinline preload="auto" poster="/assets/video/kooperative-poster.webp"><source src="/assets/video/kooperative-loop.mp4" type="video/mp4"></video>'}
      <div class="lg-stage-in"><img src="/assets/brand/symbol-gold.svg" alt=""><p class="lg-quote">${X.quote}</p><p class="lg-sign">${X.sign}</p></div></section>
    <div class="lg-panel"><form class="login" id="login">
      <div class="login-top"><img src="/assets/brand/logo-horizontal.svg" alt="Khachija" class="login-logo">${langButton()}</div>
      <p class="lg-greet">${greet}</p>
      <h1>${L.sellerSpace}</h1>
      <p class="muted">${L.loginHint}</p>
      <label>${L.password}<span class="pw-wrap"><input type="password" name="password" autocomplete="current-password" required autofocus dir="ltr"><button type="button" class="pw-eye" aria-label="${X.show}" aria-pressed="false">${eye}</button></span></label>
      <p class="caps" hidden>${X.caps}</p>
      <label class="totp-field" hidden>${{ de: 'Bestätigungscode (Authenticator-App)', en: 'Verification code (authenticator app)' }[lang]}<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" dir="ltr" placeholder="••••••"></label>
      <div class="ts-box"></div>
      <button class="btn btn-lg login-go"><span>${L.signIn}</span></button>
      <p class="error" hidden></p>
      <div class="lg-foot"><span>${lock} ${X.secure}</span><a href="/">← ${X.back}</a></div>
    </form></div>`;
    const f = document.getElementById('login');
    fetch('/api/admin/login-config', { credentials: 'same-origin' }).then((r) => r.json()).then((c) => {
      if (!c.totp) return;
      const box = f.querySelector('.totp-field');
      box.hidden = false;
      box.querySelector('input').required = true;
    }).catch(() => {});
    const eyeBtn = f.querySelector('.pw-eye');
    eyeBtn.addEventListener('click', () => {
      const on = f.password.type === 'password';
      f.password.type = on ? 'text' : 'password';
      eyeBtn.classList.toggle('on', on);
      eyeBtn.setAttribute('aria-pressed', String(on));
      f.password.focus();
    });
    const caps = f.querySelector('.caps');
    f.password.addEventListener('keyup', (e) => { if (e.getModifierState) caps.hidden = !e.getModifierState('CapsLock'); });
    // The 2FA box: digits only, and sign in by itself once the sixth digit is typed.
    f.code.addEventListener('input', () => {
      f.code.value = f.code.value.replace(/\D/g, '').slice(0, 6);
      if (f.code.value.length === 6 && f.password.value) f.requestSubmit();
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('.login-go');
      const p = f.querySelector('.error');
      btn.disabled = true;
      p.hidden = true;
      f.classList.add('busy');
      try {
        await api('/login', { method: 'POST', body: { password: f.password.value, code: f.code.value, cf_token: await loginToken(f) } });
        f.classList.remove('busy');
        f.classList.add('ok');
        if (!calm) await new Promise((r) => setTimeout(r, 520));
        start();
      } catch (err) {
        f.classList.remove('busy', 'shake');
        void f.offsetWidth; // restart the shake each time
        f.classList.add('shake');
        p.textContent = err.message;
        p.hidden = false;
        btn.disabled = false;
        f.password.select();
      }
    });
  }

  function shell(title, content, { actions = '', sub = '' } = {}) {
    document.body.className = '';
    const nav = PAGES.map(
      (k) =>
        `<a href="#${k}" class="nav-item${state.page === k ? ' on' : ''}">${icon(k)}<span class="long">${L.nav[k]}</span><span class="short">${L.navShort[k] || L.nav[k]}</span>${k === 'orders' && state.pending ? `<b class="nav-badge">${state.pending}</b>` : ''}</a>`,
    ).join('');
    app.innerHTML = `<aside class="side">
        <a href="#dashboard" class="side-logo"><img src="/assets/brand/logo-horizontal.svg" alt="${esc(state.settings.store_name || 'Khachija')}"></a>
        <nav class="side-nav">${nav}</nav>
        <div class="side-foot">
          ${langButton('side-lang')}
          <a href="/${lang}/" target="_blank" rel="noopener" class="nav-item">${icon('external')}<span>${L.viewStore}</span></a>
          <button class="nav-item" data-logout>${icon('logout')}<span>${L.logout}</span></button>
        </div>
      </aside>
      <div class="page">
        <header class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div><div class="head-actions">${langButton('mobile-only')}${actions}<button type="button" class="head-logout mobile-only" data-logout data-ask aria-label="${L.logout}" title="${L.logout}">${icon('logout', 18)}</button></div></header>
        <main class="page-body">${content}</main>
      </div>
      <nav class="tabbar">${nav}</nav>`;
  }

  document.addEventListener('click', async (e) => {
    const sw = e.target.closest('[data-lang]');
    if (sw) {
      setLang(sw.dataset.lang);
      if (document.body.classList.contains('is-login')) login();
      else route();
      return;
    }
    const out = e.target.closest('[data-logout]');
    if (out) {
      // The phone button sits next to other buttons: ask first so a slip of the finger does not sign out.
      if (out.hasAttribute('data-ask') && !confirm(L.logoutAsk)) return;
      await api('/logout', { method: 'POST', body: {} });
      login();
    }
  });
  window.addEventListener('hashchange', route);

  async function start() {
    try {
      const me = await api('/me');
      state.images = me.images;
      state.r2 = me.r2;
      state.emails = me.emails;
      state.ai = me.ai;
      state.turnstile = me.turnstile;
      state.paypal = me.paypal;
      state.settings = (await api('/settings')).settings;
      state.categories = (await api('/categories')).categories;
      route();
      if (me.weak_password) toast(L.weakPassword, true);
    } catch (err) {
      if (err.message !== 'unauthorized') app.innerHTML = `<p class="error pad">${esc(err.message)}</p>`;
    }
  }

  function route() {
    const h = location.hash.slice(1) || 'dashboard';
    const m = h.match(/^order-(\d+)$/);
    if (m) {
      if (state.page !== 'orders' || !app.querySelector('[data-order]')) {
        state.page = 'orders';
        orders().then(() => orderDetail(m[1]));
      } else orderDetail(m[1]);
      return;
    }
    state.page = PAGES.includes(h) ? h : 'dashboard';
    ({ dashboard, orders, products, categories, blog, settings })[state.page]();
    window.scrollTo(0, 0);
  }

  const loading = (title) => shell(title, '<div class="skeleton-grid"><div></div><div></div><div></div><div></div></div>');
  const catName = (c) => pick(c, 'name') || '—';
  const prodName = (p) => pick(p, 'name');

  // Dashboard
  function trend(now, prev) {
    if (!prev) return now ? `<span class="trend up">${L.isNew}</span>` : '';
    const pct = Math.round(((now - prev) / prev) * 100);
    return `<span class="trend ${pct >= 0 ? 'up' : 'down'}" dir="ltr">${icon(pct >= 0 ? 'up' : 'down', 14)}${Math.abs(pct)} %</span>`;
  }

  // Sales per day for the last 30 days: one series, bars with a hover tooltip. Time always runs left to right.
  function salesChart(daily) {
    const byDay = Object.fromEntries(daily.map((d) => [d.d, d]));
    const days = [];
    const today = new Date(Date.now() + 3600e3);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today - i * 864e5).toISOString().slice(0, 10);
      days.push({ d, sales: byDay[d]?.sales || 0, orders: byDay[d]?.orders || 0 });
    }
    const max = Math.max(...days.map((d) => d.sales), 1);
    const p10 = 10 ** Math.floor(Math.log10(max));
    const nice = [1, 2, 2.5, 5, 10].map((k) => k * p10).find((v) => v >= max);
    const W = 720, H = 220, Lm = 52, B = 26, T = 10;
    const bw = (W - Lm) / days.length;
    const y = (v) => T + (H - T - B) * (1 - v / nice);
    const grid = [0, 0.5, 1].map((f) => `<line x1="${Lm}" x2="${W}" y1="${y(nice * f)}" y2="${y(nice * f)}" class="grid"/><text x="${Lm - 8}" y="${y(nice * f) + 4}" class="axis" text-anchor="end">${num((nice * f) / 100)} €</text>`).join('');
    const bars = days
      .map((d, i) => {
        const x = Lm + i * bw;
        const h = Math.max(d.sales ? 3 : 0, H - B - y(d.sales));
        const label = new Date(`${d.d}T12:00:00Z`).toLocaleDateString(L.locale, { day: 'numeric', month: 'short', numberingSystem: 'latn' });
        return `<g class="bar" data-tip="${esc(label)} · ${dh(d.sales)} · ${L.ordersN(d.orders)}">
          <rect class="hit" x="${x}" y="${T}" width="${bw}" height="${H - T - B}"/>
          ${h ? `<path class="fill" d="M${x + 2} ${H - B} V${H - B - h + 4} q0 -4 4 -4 H${x + bw - 6} q4 0 4 4 V${H - B} Z"/>` : ''}
          ${i % 5 === 4 || i === 29 ? `<text x="${x + bw / 2}" y="${H - 6}" class="axis" text-anchor="middle">${esc(label)}</text>` : ''}
        </g>`;
      })
      .join('');
    return `<div class="chart" dir="ltr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L.salesChartLabel}">${grid}<line x1="${Lm}" x2="${W}" y1="${H - B}" y2="${H - B}" class="base"/>${bars}</svg><div class="tip" hidden></div></div>`;
  }

  function wireTips(root) {
    root.querySelectorAll('.chart').forEach((c) => {
      const tip = c.querySelector('.tip');
      c.addEventListener('pointermove', (e) => {
        const g = e.target.closest('[data-tip]');
        if (!g) return (tip.hidden = true);
        c.querySelectorAll('.bar.on, .mbar.on').forEach((b) => b.classList.remove('on'));
        g.classList.add('on');
        tip.textContent = g.dataset.tip;
        tip.dir = 'ltr';
        tip.hidden = false;
        const r = c.getBoundingClientRect();
        tip.style.left = `${Math.min(Math.max(e.clientX - r.left, 90), r.width - 90)}px`;
        tip.style.top = `${e.clientY - r.top - 44}px`;
      });
      c.addEventListener('pointerleave', () => {
        tip.hidden = true;
        c.querySelectorAll('.bar.on').forEach((b) => b.classList.remove('on'));
      });
    });
  }

  // Order pipeline for the last 30 days: one stacked bar, each status labelled in the legend.
  function pipeline(by) {
    const total = STATUS_KEYS.reduce((a, k) => a + (by[k] || 0), 0);
    if (!total) return `<p class="empty-small">${L.noOrdersMonth}</p>`;
    return `<div class="stack">${STATUS_KEYS.filter((k) => by[k]).map((k) => `<span class="seg s-${k}" style="flex:${by[k]}" title="${L.status[k]} : ${by[k]}"></span>`).join('')}</div>
      <ul class="legend">${STATUS_KEYS.map((k) => `<li><i class="dot s-${k}"></i>${L.status[k]}<b>${by[k] || 0}</b></li>`).join('')}</ul>`;
  }

  function hbars(rows, label, value, fmt) {
    if (!rows.length) return `<p class="empty-small">${L.nothingYet}</p>`;
    const max = Math.max(...rows.map(value), 1);
    return `<ul class="hbars">${rows.map((r) => `<li><span class="hb-label">${label(r)}</span><span class="hb-track"><span style="width:${(value(r) / max) * 100}%"></span></span><b>${fmt(r)}</b></li>`).join('')}</ul>`;
  }

  // ── Advanced dashboard widgets ──
  const D = {
    en: { customers: 'Customers · 30 d', customersFoot: 'different buyers', returning: 'Returning customers', returningFoot: (n, t) => `${n} of ${t} bought more than once`, basket: 'Items per order', basketFoot: 'average, 30 days', subs: 'Newsletter', subsFoot: (n) => `+${n} in 30 days`, months: 'Sales by month', months12: 'Last 12 months', payments: 'Payment methods', countries: 'Countries', categories: 'Sales by category', heat: 'When customers order', heatSub: 'Last 90 days', heatHint: 'The darker the cell, the more orders. Good times for posts and newsletters.', health: 'Shop health', active: 'Products online', soldOut: 'Sold out', noPhoto: 'Without photo', hiddenP: 'Hidden', emailRate: 'Orders with email', freeShip: 'Free shipping', days: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], slots: ['0–4', '4–8', '8–12', '12–16', '16–20', '20–24'], share: 'of sales' },
    de: { customers: 'Kundinnen · 30 T.', customersFoot: 'verschiedene Käuferinnen', returning: 'Stammkundinnen', returningFoot: (n, t) => `${n} von ${t} haben mehrmals bestellt`, basket: 'Artikel pro Bestellung', basketFoot: 'Durchschnitt, 30 Tage', subs: 'Newsletter', subsFoot: (n) => `+${n} in 30 Tagen`, months: 'Umsatz pro Monat', months12: 'Letzte 12 Monate', payments: 'Zahlungsarten', countries: 'Länder', categories: 'Umsatz nach Kategorie', heat: 'Wann bestellt wird', heatSub: 'Letzte 90 Tage', heatHint: 'Je dunkler das Feld, desto mehr Bestellungen. Gute Zeiten für Beiträge und Newsletter.', health: 'Shop-Zustand', active: 'Produkte online', soldOut: 'Ausverkauft', noPhoto: 'Ohne Foto', hiddenP: 'Ausgeblendet', emailRate: 'Bestellungen mit E-Mail', freeShip: 'Kostenloser Versand', days: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], slots: ['0–4', '4–8', '8–12', '12–16', '16–20', '20–24'], share: 'vom Umsatz' },
  };
  const DL = () => D[lang] || D.en;
  const COUNTRY_DE = { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz', NL: 'Niederlande', BE: 'Belgien', FR: 'Frankreich', LU: 'Luxemburg', DK: 'Dänemark', IT: 'Italien', ES: 'Spanien', PL: 'Polen' };
  const countryLabel = (c) => { try { return new Intl.DisplayNames([lang], { type: 'region' }).of(c); } catch { return COUNTRY_DE[c] || c; } };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  function ring(value, label) {
    const v = Math.max(0, Math.min(100, value));
    return `<span class="ring" style="--v:${v}"><b>${v}<small>%</small></b></span><span class="ring-label">${label}</span>`;
  }

  // Twelve months of sales, oldest first.
  function monthsChart(rows) {
    const by = Object.fromEntries(rows.map((r) => [r.m, r]));
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ k, label: d.toLocaleDateString(L.locale, { month: 'short' }), sales: by[k]?.sales || 0, n: by[k]?.n || 0 });
    }
    const max = Math.max(...months.map((m) => m.sales), 1);
    return `<div class="chart months" dir="ltr">${months.map((m, i) => `<div class="mbar${i === 11 ? ' now' : ''}" data-tip="${esc(m.label)} · ${dh(m.sales)} · ${L.ordersN(m.n)}"><span style="height:${Math.max(m.sales ? 4 : 0, (m.sales / max) * 100)}%"></span><small>${esc(m.label)}</small></div>`).join('')}<div class="tip" hidden></div></div>`;
  }

  // Donut of payment methods.
  function payDonut(rows) {
    const total = rows.reduce((a, r) => a + r.n, 0);
    if (!total) return `<p class="empty-small">${L.nothingYet}</p>`;
    const colors = { paypal: '#2f5e4a', bank: '#c9a25c', cod: '#a9532f' };
    let acc = 0;
    const stops = rows.map((r) => { const a = acc; acc += (r.n / total) * 100; return `${colors[r.m] || '#999'} ${a}% ${acc}%`; }).join(', ');
    return `<div class="donut-wrap"><span class="donut" style="background:conic-gradient(${stops})"><b>${total}</b></span><ul class="legend">${rows.map((r) => `<li><i class="dot" style="background:${colors[r.m] || '#999'}"></i>${esc(XL().method[r.m] || r.m)}<b>${pct(r.n, total)} %</b></li>`).join('')}</ul></div>`;
  }

  // Weekday × 4-hour heatmap.
  function heatmap(rows) {
    const g = Array.from({ length: 7 }, () => Array(6).fill(0));
    rows.forEach((r) => { g[r.wd][Math.floor(r.h / 4)] += r.n; });
    const max = Math.max(1, ...g.flat());
    const order = [1, 2, 3, 4, 5, 6, 0];
    return `<div class="heat" dir="ltr"><span></span>${DL().slots.map((s) => `<span class="hh">${s}</span>`).join('')}${order.map((d) => `<span class="hd">${DL().days[d]}</span>${g[d].map((n, k) => `<span class="hc" style="--a:${n ? 0.15 + 0.85 * (n / max) : 0}" title="${DL().days[d]} ${DL().slots[k]} h · ${n}">${n || ''}</span>`).join('')}`).join('')}</div><p class="muted small">${DL().heatHint}</p>`;
  }

  function advancedCards(s) {
    const x = DL();
    const c = s.catalog || {};
    const cu = s.customers || {};
    const catTotal = (s.categories || []).reduce((a, r) => a + (r.sales || 0), 0);
    return `
      <div class="card span-2"><div class="card-head"><h2>${x.months}</h2><span class="muted small">${x.months12}</span></div>${monthsChart(s.monthly || [])}</div>
      <div class="card"><div class="card-head"><h2>${x.payments}</h2><span class="muted small">${L.days30}</span></div>${payDonut(s.payments || [])}</div>
      <div class="card span-2"><div class="card-head"><h2>${x.heat}</h2><span class="muted small">${x.heatSub}</span></div>${heatmap(s.heat || [])}</div>
      <div class="card"><div class="card-head"><h2>${x.health}</h2></div>
        <div class="rings">${ring(pct(cu.with_email || 0, cu.n || 0), x.emailRate)}${ring(pct(cu.free_ship || 0, cu.n || 0), x.freeShip)}</div>
        <ul class="health"><li><span>${x.active}</span><b>${c.active || 0}</b></li><li class="${c.sold_out ? 'warn' : ''}"><span>${x.soldOut}</span><b>${c.sold_out || 0}</b></li><li class="${c.no_photo ? 'warn' : ''}"><span>${x.noPhoto}</span><b>${c.no_photo || 0}</b></li><li><span>${x.hiddenP}</span><b>${c.hidden || 0}</b></li></ul>
        <a href="#products" class="link-arrow">${L.nav.products} ${icon('arrow', 16)}</a></div>
      <div class="card"><div class="card-head"><h2>${x.categories}</h2><span class="muted small">${L.days30}</span></div>${hbars(s.categories || [], (r) => esc((lang === 'en' && r.name_en) || r.name_de || '—'), (r) => r.sales || 0, (r) => `${pct(r.sales, catTotal)} %`)}</div>
      <div class="card"><div class="card-head"><h2>${x.countries}</h2><span class="muted small">${L.ordersShort30}</span></div>${hbars(s.countries || [], (r) => esc(countryLabel(r.c)), (r) => r.n, (r) => r.n)}</div>`;
  }

  function miniKpis(s) {
    const x = DL();
    const cu = s.customers || {};
    const re = s.returning || {};
    const live = (s.orders_30d || 0) - (s.failed_30d || 0);
    const basket = live > 0 ? (s.items_30d / live).toFixed(1).replace('.', lang === 'de' ? ',' : '.') : '0';
    const sub = s.subscribers || {};
    const tile = (ic, label, value, foot) => `<div class="kpi kpi-mini"><span class="kpi-ico">${icon(ic, 18)}</span><span class="kpi-label">${label}</span><strong class="kpi-value">${value}</strong><span class="kpi-foot">${foot}</span></div>`;
    return `<section class="kpis kpis-mini">
      ${tile('orders', x.customers, num(cu.customers || 0), x.customersFoot)}
      ${tile('up', x.returning, `${pct(re.repeaters || 0, re.customers || 0)} %`, x.returningFoot(re.repeaters || 0, re.customers || 0))}
      ${tile('products', x.basket, basket, x.basketFoot)}
      ${tile('mail', x.subs, num(sub.total || 0), x.subsFoot(sub.new30 || 0))}
    </section>`;
  }

  function emailCard() {
    const s = state.settings;
    const ready = state.emails && s.email_from;
    return `<section class="card email-card ${ready ? 'ok' : ''}">
      <div class="card-head"><h2>${icon('mail')} ${L.emails}</h2><span class="chip ${ready ? 'chip-ok' : 'chip-warn'}">${ready ? L.emailsOn : L.emailsOff}</span></div>
      <p class="muted">${ready ? L.emailsOnText(`<bdi>${esc(s.notify_email || s.contact_email || '—')}</bdi>`) : L.emailsOffText}</p>
      <a href="#settings" class="link-arrow">${ready ? L.emailSettings : L.setUp} ${icon('arrow', 16)}</a>
    </section>`;
  }

  async function dashboard() {
    loading(L.nav.dashboard);
    const s = await api('/stats');
    state.pending = s.new_orders || 0;
    const aov = s.orders_30d - s.failed_30d > 0 ? s.sales_30d / (s.orders_30d - s.failed_30d) : 0;
    const closed = (s.delivered_30d || 0) + (s.failed_30d || 0);
    const rate = closed ? Math.round((s.delivered_30d / closed) * 100) : null;
    const hour = new Date().getHours();
    const hello = L.hello[hour < 12 ? 0 : hour < 18 ? 1 : 2];
    const today = new Date().toLocaleDateString(L.locale, { weekday: 'long', day: 'numeric', month: 'long', numberingSystem: 'latn' });
    shell(
      `${hello} 👋`,
      `${s.awaiting_transfer || s.awaiting_paypal ? `<a href="#orders" class="callout" data-pay-filter>${icon('alert')}<span><strong>${XL().openPayments}</strong> ${XL().awaiting(s.awaiting_transfer || 0, s.awaiting_paypal || 0)}</span>${icon('arrow', 18)}</a>` : ''}${s.new_orders ? `<a href="#orders" class="callout" data-filter="new">${icon('alert')}<span><strong>${L.pending(s.new_orders)}</strong> ${L.pendingHint}</span>${icon('arrow', 18)}</a>` : ''}
      <section class="kpis">
        <div class="kpi kpi-hero"><span class="kpi-label">${L.sales30}</span><strong class="kpi-value">${dh(s.sales_30d)}</strong>${trend(s.sales_30d || 0, s.sales_prev || 0)}<span class="kpi-foot">${L.today}${colon()}${dh(s.today_sales)}</span></div>
        <div class="kpi"><span class="kpi-label">${L.orders30}</span><strong class="kpi-value">${num(s.orders_30d)}</strong>${trend(s.orders_30d || 0, s.orders_prev || 0)}<span class="kpi-foot">${L.today}${colon()}${num(s.today)}</span></div>
        <div class="kpi"><span class="kpi-label">${L.aov}</span><strong class="kpi-value">${dh(aov)}</strong><span class="kpi-foot">${L.excludingCancelled}</span></div>
        <div class="kpi"><span class="kpi-label">${L.collected30}</span><strong class="kpi-value">${dh(s.revenue_30d)}</strong><span class="kpi-foot">${rate == null ? L.deliveredOrders : L.deliveredRate(rate)}</span></div>
      </section>
      ${miniKpis(s)}
      <section class="grid-2">
        <div class="card span-2"><div class="card-head"><h2>${L.salesPerDay}</h2><span class="muted small">${L.last30dh}</span></div>${salesChart(s.daily)}</div>
        <div class="card"><div class="card-head"><h2>${L.pipeline}</h2><span class="muted small">${L.days30}</span></div>${pipeline(s.by_status)}</div>
        <div class="card"><div class="card-head"><h2>${L.cities}</h2><span class="muted small">${L.ordersShort30}</span></div>${hbars(s.top_cities, (r) => esc(r.city), (r) => r.n, (r) => r.n)}</div>
        <div class="card"><div class="card-head"><h2>${L.bestSellers}</h2><span class="muted small">${L.days30}</span></div>
          ${s.top_products.length ? `<ol class="top">${s.top_products.map((p, i) => `<li><span class="rank">${i + 1}</span><img src="${esc(p.image || '/assets/placeholder.svg')}" alt=""><span class="grow">${esc((lang === 'en' && p.name_en) || p.name)}<small>${dh(p.sales)}</small></span><b dir="ltr">${p.qty}×</b></li>`).join('')}</ol>` : `<p class="empty-small">${L.bestSellersEmpty}</p>`}
        </div>
        <div class="card"><div class="card-head"><h2>${L.latestOrders}</h2><a href="#orders" class="link-arrow">${L.seeAll} ${icon('arrow', 16)}</a></div>
          ${s.recent.length ? `<ul class="recent">${s.recent.map((o) => `<li><a href="#order-${o.id}"><span class="avatar">${esc((o.name || '?').trim().charAt(0).toUpperCase())}</span><span class="grow"><strong><bdi>${esc(o.name)}</bdi></strong><small><bdi>${esc(o.city)}</bdi> · ${ago(o.created_at)}</small></span><span class="end"><b>${dh(o.total)}</b><span class="status s-${o.status}">${L.status[o.status]}</span></span></a></li>`).join('')}</ul>` : `<p class="empty-small">${L.noOrdersYet}</p>`}
        </div>
        ${s.low_stock.length ? `<div class="card"><div class="card-head"><h2>${icon('alert')} ${L.lowStock}</h2></div><ul class="recent">${s.low_stock.map((p) => `<li><a href="#products"><img class="thumb" src="${esc(JSON.parse(p.images || '[]')[0] || '/assets/placeholder.svg')}" alt=""><span class="grow"><strong>${esc(prodName(p))}</strong></span><span class="chip ${p.stock ? 'chip-warn' : 'chip-bad'}">${p.stock ? L.left(p.stock) : L.soldOut}</span></a></li>`).join('')}</ul></div>` : ''}
        ${advancedCards(s)}
        ${emailCard()}
      </section>`,
      { sub: today.charAt(0).toUpperCase() + today.slice(1), actions: `<a class="btn ghost" href="/api/admin/orders.csv">${icon('download', 18)}<span>${L.exportCsv}</span></a>` },
    );
    app.querySelector('[data-filter]')?.addEventListener('click', () => (state.status = 'new'));
    app.querySelector('[data-pay-filter]')?.addEventListener('click', () => ((state.status = ''), (state.payment = 'open')));
    wireTips(app);
  }

  // Orders
  async function orders() {
    loading(L.nav.orders);
    const list = await api(`/orders?status=${state.status}&q=${encodeURIComponent(state.q)}&payment=${state.payment || ''}`);
    state.pending = list.counts.new || 0;
    const all = Object.values(list.counts).reduce((a, b) => a + b, 0);
    const filters = [['', L.all, all], ...STATUS_KEYS.map((k) => [k, L.status[k], list.counts[k] || 0])];
    shell(
      L.nav.orders,
      `${orderSummary(list)}
      <div class="toolbar">
        <div class="filters">${filters.map(([k, v, n]) => `<button class="pill${state.status === k ? ' on' : ''}" data-status="${k}">${k ? `<i class="dot s-${k}"></i>` : ''}${v}<span>${n}</span></button>`).join('')}</div>
        <form class="search" id="osearch">${icon('search', 18)}<input type="search" name="q" value="${esc(state.q)}" placeholder="${L.searchOrders}"></form>
      </div>
      ${state.payment === 'open' ? `<p class="filter-note">${XL().openPayments} · <button type="button" class="link-btn" data-clear-pay>${L.all}</button></p>` : ''}
      ${list.orders.length ? `<div class="order-list">${list.orders.map(orderRow).join('')}</div>` : `<div class="card empty">${icon('orders', 36)}<p>${state.q || state.status ? L.noMatch : L.noOrdersYet}</p></div>`}`,
      { sub: L.total(all), actions: `<a class="btn ghost" href="/api/admin/orders.csv?status=${state.status}">${icon('download', 18)}<span>${L.exportCsv}</span></a>` },
    );
    app.querySelectorAll('[data-status]').forEach((b) =>
      b.addEventListener('click', () => {
        state.status = b.dataset.status;
        state.payment = '';
        orders();
      }),
    );
    document.getElementById('osearch').addEventListener('submit', (e) => {
      e.preventDefault();
      state.q = e.target.q.value.trim();
      orders();
    });
    app.querySelectorAll('[data-order]').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.closest('a')) return; location.hash = `order-${tr.dataset.order}`; }));
    app.querySelectorAll('[data-sum]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.sum;
      state.q = '';
      if (k === 'pay') { state.status = ''; state.payment = 'open'; } else { state.status = k; state.payment = ''; }
      orders();
    }));
    app.querySelector('[data-clear-pay]')?.addEventListener('click', () => { state.payment = ''; orders(); });
  }

  // ── Orders page widgets ──
  const O = {
    en: { toConfirm: 'To confirm', toShip: 'To ship', openPay: 'Open payments', revenue: 'Total sales', last24: (n) => `${n} in the last 24 h`, ready: 'confirmed, ready to pack', items: (n) => (n === 1 ? '1 item' : `${n} items`), awaiting: (a) => `${a} outstanding`, allTime: 'all orders, excl. cancelled' },
    de: { toConfirm: 'Zu bestätigen', toShip: 'Zu versenden', openPay: 'Offene Zahlungen', revenue: 'Umsatz gesamt', last24: (n) => `${n} in den letzten 24 Std.`, ready: 'bestätigt, bereit zum Packen', items: (n) => (n === 1 ? '1 Artikel' : `${n} Artikel`), awaiting: (a) => `${a} ausstehend`, allTime: 'alle Bestellungen, ohne Stornos' },
  };
  const OL = () => O[lang] || O.en;
  const flag = (c) => (/^[A-Z]{2}$/.test(c || '') ? String.fromCodePoint(...[...c].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : '');
  const hue = (s) => [...String(s || '')].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 360, 7);
  const PAY_ICON = { paypal: 'P', bank: '€', cod: '✉' };

  function orderSummary(list) {
    const x = OL();
    const s = list.summary || {};
    const c = list.counts || {};
    const tile = (key, cls, ic, label, value, foot, on) => `<button type="button" class="osum ${cls}${on ? ' on' : ''}" data-sum="${key}"><span class="osum-ico">${icon(ic, 18)}</span><span class="osum-label">${label}</span><strong>${value}</strong><small>${foot}</small></button>`;
    return `<section class="osums">
      ${tile('new', 'gold', 'alert', x.toConfirm, num(c.new || 0), x.last24(s.last24 || 0), state.status === 'new')}
      ${tile('confirmed', 'green', 'orders', x.toShip, num(c.confirmed || 0), x.ready, state.status === 'confirmed')}
      ${tile('pay', 'terra', 'download', x.openPay, num(s.open_pay || 0), x.awaiting(dh(s.open_amount || 0)), state.payment === 'open')}
      ${tile('', 'dark', 'up', x.revenue, dh(s.revenue || 0), x.allTime, false)}
    </section>`;
  }

  function orderRow(o) {
    const x = OL();
    const name = (o.name || '').trim() || '—';
    const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const thumbs = (o.thumbs || []).slice(0, 3);
    const payCls = o.payment_status === 'paid' ? 'chip-ok' : o.payment_method === 'cod' ? '' : 'chip-warn';
    return `<article class="orow s-row-${o.status}" data-order="${o.id}" tabindex="0">
      <span class="orow-av" style="--h:${hue(name)}">${esc(initials)}</span>
      <div class="orow-main"><strong><bdi>${esc(name)}</bdi></strong><small><span class="mono" dir="ltr">${esc(o.number)}</span> · ${ago(o.created_at)}</small></div>
      <div class="orow-where hide-sm"><span class="flag">${flag(o.country)}</span><span>${esc(o.zip)} ${esc(o.city)}</span></div>
      <div class="orow-items hide-sm">${thumbs.length ? `<span class="thumbs">${thumbs.map((t) => `<img src="${esc(t)}" alt="" loading="lazy">`).join('')}</span>` : ''}<small>${x.items(o.items_n || 0)}</small></div>
      <div class="orow-pay hide-sm"><span class="pay-ic pay-${o.payment_method}">${PAY_ICON[o.payment_method] || '·'}</span><span><small>${XL().method[o.payment_method] || ''}</small><span class="chip ${payCls}">${XL().payStatus[o.payment_status] || ''}</span></span></div>
      <div class="orow-end"><strong class="orow-total">${dh(o.total)}</strong><span class="status s-${o.status}">${L.status[o.status] || o.status}</span></div>
      ${o.phone ? `<a class="orow-wa hide-sm" href="https://wa.me/${esc(String(o.phone).replace(/[^\d]/g, ''))}" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp">${icon('phone', 16)}</a>` : '<span class="hide-sm"></span>'}
    </article>`;
  }

  // ── Printable receipt and delivery note (A4) ──
  const PR = () => ({
    de: { button: 'Beleg drucken', title: 'Rechnung & Lieferschein', no: 'Rechnungs-/Bestellnr.', date: 'Datum', delivery: 'Lieferdatum', customer: 'Lieferadresse', seller: 'Inhaberin', pos: 'Pos.', item: 'Artikel', qty: 'Menge', unit: 'Einzelpreis', sum: 'Summe', subtotal: 'Zwischensumme', discount: 'Mengenrabatt', shipping: 'Versand', codFee: 'Nachnahmegebühr', total: 'Gesamtbetrag', vatSmall: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', vatIncl: (r, v) => `Im Gesamtbetrag enthaltene Umsatzsteuer (${r} %): ${v}`, pay: 'Zahlungsart', paid: 'Bezahlt – vielen Dank!', open: 'Noch offen', cod: 'Bitte bei Lieferung bar an den DHL-Boten zahlen.', bank: 'Bitte überweisen Sie den Betrag auf folgendes Konto:', ref: 'Verwendungszweck', check: 'Vom Kunden geprüft', thanks: 'Vielen Dank für Ihren Einkauf! Handgemacht von Frauenkooperativen in Marokko, versandt aus Hamburg.', returns: 'Widerrufsrecht: 14 Tage. Geöffnete Kosmetik ist aus hygienischen Gründen vom Umtausch ausgeschlossen. Details unter', page: 'Seite', note: 'Hinweis der Kundin' },
    en: { button: 'Print receipt', title: 'Invoice & delivery note', no: 'Invoice / order no.', date: 'Date', delivery: 'Delivery date', customer: 'Delivery address', seller: 'Owner', pos: 'No.', item: 'Item', qty: 'Qty', unit: 'Unit price', sum: 'Amount', subtotal: 'Subtotal', discount: 'Quantity discount', shipping: 'Shipping', codFee: 'Cash-on-delivery fee', total: 'Total', vatSmall: 'No VAT is charged under § 19 UStG (small business).', vatIncl: (r, v) => `VAT included in the total (${r} %): ${v}`, pay: 'Payment', paid: 'Paid – thank you!', open: 'Outstanding', cod: 'Please pay the DHL courier in cash on delivery.', bank: 'Please transfer the amount to this account:', ref: 'Reference', check: 'Checked by customer', thanks: 'Thank you for your order! Handmade by women’s cooperatives in Morocco, shipped from Hamburg.', returns: 'Right of withdrawal: 14 days. Opened cosmetics cannot be returned for hygiene reasons. Details at', page: 'Page', note: 'Customer note' },
  })[lang === 'de' ? 'de' : 'en'];

  function printReceipt(o, items) {
    const t = PR();
    const s = state.settings || {};
    const money = (c) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((Math.round(c) || 0) / 100);
    const day = (d) => new Date(`${String(d).replace(' ', 'T')}Z`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const lineSum = items.reduce((a, i) => a + i.price * i.qty, 0);
    const discount = Math.max(0, lineSum - (o.subtotal || lineSum));
    const sellerAddr = String(s.legal_address || '').split(/,\s*/).map(esc).join('<br>');
    const country = (c) => { try { return new Intl.DisplayNames(['de'], { type: 'region' }).of(c); } catch { return c; } };
    const iban = String(s.bank_iban || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
    const payBlock = o.payment_status === 'paid'
      ? `<p class="pay ok">✓ ${t.paid}</p>`
      : o.payment_method === 'cod'
        ? `<p class="pay due">${t.cod}</p>`
        : o.payment_method === 'bank' && iban
          ? `<div class="pay due"><p>${t.bank}</p><p class="bank">${esc(s.bank_owner || s.legal_name || '')}<br>IBAN ${esc(iban)}${s.bank_bic ? `<br>BIC ${esc(s.bank_bic)}` : ''}${s.bank_name ? ` · ${esc(s.bank_name)}` : ''}<br>${t.ref}: <b>${esc(o.number)}</b></p></div>`
          : `<p class="pay due">${t.open}</p>`;
    const sheet = document.createElement('div');
    sheet.className = 'print-sheet';
    sheet.innerHTML = `
      <header class="ps-head">
        <img src="/assets/brand/logo-horizontal.svg" alt="${esc(s.store_name || 'Khachija')}">
        <div class="ps-seller"><b>${esc(s.legal_company || s.store_name || 'Khachija')}</b><br>${t.seller}: ${esc(s.legal_name || '')}<br>${sellerAddr}${s.phone ? `<br>${esc(s.phone)}` : ''}${s.contact_email ? `<br>${esc(s.contact_email)}` : ''}</div>
      </header>
      <div class="ps-rule"><span></span></div>
      <section class="ps-meta">
        <div class="ps-to"><small>${t.customer}</small><p><b>${esc(o.first_name)} ${esc(o.last_name || '')}</b><br>${esc(o.street)}${o.address2 ? `<br>${esc(o.address2)}` : ''}<br>${esc(o.zip)} ${esc(o.city)}<br>${esc(country(o.country))}${o.phone ? `<br>Tel. ${esc(o.phone_display || o.phone)}` : ''}</p></div>
        <div class="ps-doc"><h1>${t.title}</h1><table><tr><td>${t.no}</td><td><b>${esc(o.number)}</b></td></tr><tr><td>${t.date}</td><td>${day(o.created_at)}</td></tr><tr><td>${t.delivery}</td><td>${day(new Date().toISOString().slice(0, 19).replace('T', ' '))}</td></tr><tr><td>${t.pay}</td><td>${esc(XL().method[o.payment_method] || o.payment_method)}</td></tr></table></div>
      </section>
      <table class="ps-items">
        <thead><tr><th>${t.pos}</th><th>${t.item}</th><th class="n">${t.qty}</th><th class="n">${t.unit}</th><th class="n">${t.sum}</th><th class="c">✓</th></tr></thead>
        <tbody>${items.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.name)}${i.option ? `<br><small>${esc(i.option)}</small>` : ''}</td><td class="n">${i.qty}</td><td class="n">${money(i.price)}</td><td class="n">${money(i.price * i.qty)}</td><td class="c"><span class="ps-check"></span></td></tr>`).join('')}</tbody>
      </table>
      <section class="ps-totals">
        <table>
          <tr><td>${t.subtotal}</td><td>${money(lineSum)}</td></tr>
          ${discount ? `<tr><td>${t.discount}</td><td>− ${money(discount)}</td></tr>` : ''}
          <tr><td>${t.shipping}</td><td>${o.shipping ? money(o.shipping) : '0,00 €'}</td></tr>
          ${o.payment_fee ? `<tr><td>${t.codFee}</td><td>${money(o.payment_fee)}</td></tr>` : ''}
          <tr class="grand"><td>${t.total}</td><td>${money(o.total)}</td></tr>
        </table>
        <p class="vat">${s.vat_mode === 'included' ? t.vatIncl(esc(s.vat_rate || '19'), money(o.vat || 0)) : t.vatSmall}</p>
      </section>
      ${payBlock}
      ${o.note ? `<p class="ps-note"><b>${t.note}:</b> „${esc(o.note)}“</p>` : ''}
      <footer class="ps-foot">
        <img src="/assets/brand/symbol-gold.svg" alt="">
        <p class="thanks">${t.thanks}</p>
        <p>${t.returns} ${esc(location.host)}/de/widerruf</p>
        <p class="legal">${esc(s.legal_company || s.store_name || 'Khachija')} · ${esc(s.legal_name || '')} · ${esc(s.legal_address || '')}${s.legal_vat_id ? ` · USt-IdNr. ${esc(s.legal_vat_id)}` : ''}${s.legal_wid ? ` · W-IdNr. ${esc(s.legal_wid)}` : ''}${s.legal_register ? ` · ${esc(s.legal_register)}` : ''}</p>
      </footer>`;
    document.querySelector('.print-sheet')?.remove();
    document.body.append(sheet);
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); sheet.remove(); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    // Print once the logo has loaded, so it is never missing on paper.
    const imgs = [...sheet.querySelectorAll('img')];
    Promise.all(imgs.map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; })))).then(() => window.print());
  }

  // WhatsApp message to the customer, in their language.
  function confirmMessage(o) {
    const store = state.settings.store_name || '';
    const total = dh(o.total);
    if (o.lang === 'ar') return `مرحبًا ${o.first_name}، شكرًا على طلبك رقم ${o.number} (${total}) من ${store}.`;
    if (o.lang === 'en') return `Hello ${o.first_name}, thank you for your order ${o.number} (${total}) from ${store}.`;
    return `Hallo ${o.first_name}, vielen Dank für Ihre Bestellung ${o.number} (${total}) bei ${store}.`;
  }

  async function orderDetail(id) {
    document.querySelector('dialog.drawer')?.close();
    const { order: o, items, events = [] } = await api(`/orders/${id}`);
    const x = XL();
    const flow = ['new', 'confirmed', 'shipped', 'delivered'];
    const at = flow.indexOf(o.status);
    const emailNote = o.email && state.emails && state.settings.email_from && state.settings.email_status_updates !== '0';
    const waNum = String(o.phone || '').replace(/\D/g, '');
    const paid = o.payment_status === 'paid';
    const dialog = document.createElement('dialog');
    dialog.className = 'drawer';
    dialog.innerHTML = `<form method="dialog" class="drawer-head"><div><p class="muted small">${L.orderAt} · <bdi>${when(o.created_at)}</bdi></p><h2 class="mono" dir="ltr">${esc(o.number)}</h2></div><button type="button" class="btn ghost print-btn" data-print>${icon('download', 18)}<span>${PR().button}</span></button><button class="close" aria-label="${L.close}">✕</button></form>
      <ol class="steps">${flow.map((k, i) => `<li class="${at >= i ? 'done' : ''}${o.status === k ? ' now' : ''}"><span>${at >= i ? icon('check', 12) : ''}</span>${L.status[k]}</li>`).join('')}</ol>
      ${at < 0 ? `<p><span class="status s-${o.status}">${L.status[o.status]}</span></p>` : ''}
      <section class="box">
        <div class="cust"><span class="avatar lg">${esc((o.first_name || '?').trim().charAt(0).toUpperCase())}</span><div><strong><bdi>${esc(o.name)}</bdi></strong><small>${L.language} : ${LANG_LABEL[o.lang] || o.lang}</small></div></div>
        <dl class="kv">
          <dt>${L.email}</dt><dd><a href="mailto:${esc(o.email)}" dir="ltr">${esc(o.email)}</a></dd>
          ${o.phone ? `<dt>${L.phone}</dt><dd><a href="tel:${esc(o.phone)}" dir="ltr">${esc(o.phone_display)}</a></dd>` : ''}
          <dt>${L.address}</dt><dd>${esc(o.street)}${o.address2 ? `<br>${esc(o.address2)}` : ''}<br>${esc(o.zip)} ${esc(o.city)}<br>${esc(o.country)}</dd>
          ${o.note ? `<dt>${L.note}</dt><dd>„${esc(o.note)}“</dd>` : ''}
        </dl>
        <div class="actions">
          <a class="btn ghost" href="mailto:${esc(o.email)}?subject=${encodeURIComponent(o.number)}">${icon('mail', 18)}<span>E-Mail</span></a>
          ${waNum ? `<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${esc(waNum)}?text=${encodeURIComponent(confirmMessage(o))}">WhatsApp</a><a class="btn ghost" href="tel:${esc(o.phone)}">${icon('phone', 18)}<span>${L.call}</span></a>` : ''}
        </div>
      </section>
      <section class="box">
        <div class="card-head"><h3>${x.payment}: ${x.method[o.payment_method] || o.payment_method}</h3><span class="chip ${paid ? 'chip-ok' : 'chip-warn'}">${x.payStatus[o.payment_status] || o.payment_status}</span></div>
        ${o.paypal_capture_id ? `<p class="muted small" dir="ltr">PayPal: ${esc(o.paypal_capture_id)}</p>` : ''}
        <div class="actions">${paid ? `<button type="button" class="btn ghost" data-pay="refunded">${x.markRefunded}</button>` : `<button type="button" class="btn" data-pay="paid">${icon('check', 18)}<span>${x.markPaid}</span></button>`}</div>
      </section>
      <section class="box">
        <ul class="lines">${items.map((i) => `<li><span>${esc(i.name)}${i.option ? ` <small dir="auto">(${esc(i.option)})</small>` : ''} <small dir="ltr">× ${i.qty}</small></span><b>${dh(i.price * i.qty)}</b></li>`).join('')}
          <li class="muted"><span>${L.delivery}</span><span>${o.shipping ? dh(o.shipping) : L.free}</span></li>
          ${o.payment_fee ? `<li class="muted"><span>${x.codFee}</span><span>${dh(o.payment_fee)}</span></li>` : ''}
          <li class="total"><span>${L.thTotal}</span><b>${dh(o.total)}</b></li>
          ${o.vat ? `<li class="muted"><span>${x.vat}</span><span>${dh(o.vat)}</span></li>` : ''}</ul>
      </section>
      <section class="box">
        <h3>${x.tracking}</h3>
        <div class="cols"><label>${x.carrier}<select name="carrier">${['DHL', 'Deutsche Post', 'Hermes', 'DPD', 'GLS'].map((c) => `<option${(o.carrier || 'DHL') === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label><label>${x.trackingNo}<input name="tracking" dir="ltr" value="${esc(o.tracking || '')}"></label></div>
        <div class="actions"><button type="button" class="btn ghost" data-track>${x.saveTracking}</button></div>
      </section>
      <label>${L.adminNote}<textarea name="admin_note" rows="2" placeholder="${L.adminNoteHint}">${esc(o.admin_note)}</textarea></label>
      <div><p class="label">${L.changeStatus}</p>
      <div class="filters">${STATUS_KEYS.map((k) => `<button type="button" class="pill${o.status === k ? ' on' : ''}" data-set="${k}"><i class="dot s-${k}"></i>${L.status[k]}</button>`).join('')}</div>
      ${emailNote ? `<p class="muted small">${icon('mail', 14)} ${L.statusEmailHint}</p>` : ''}</div>
      ${events.length ? `<details><summary class="muted small">${x.events}</summary><ul class="lines">${events.map((e) => `<li class="muted small"><span>${esc(e.kind)} · ${esc(e.value)}</span><span>${when(e.created_at)}</span></li>`).join('')}</ul></details>` : ''}`;
    document.body.append(dialog);
    dialog.querySelector('[data-print]').addEventListener('click', () => printReceipt(o, items));
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (location.hash === `#order-${id}`) history.replaceState(null, '', '#orders');
    });
    const patch = async (body, msg) => {
      try {
        const r = await api(`/orders/${id}`, { method: 'PATCH', body: { ...body, admin_note: dialog.querySelector('[name=admin_note]').value } });
        toast(r.emailed ? L.updatedEmailed : msg);
        dialog.close();
        orders();
      } catch (err) {
        toast(err.message, true);
      }
    };
    dialog.addEventListener('click', async (e) => {
      if (e.target === dialog) dialog.close();
      const pay = e.target.closest('[data-pay]');
      if (pay) return patch({ payment_status: pay.dataset.pay }, x.paidOk);
      if (e.target.closest('[data-track]')) return patch({ carrier: dialog.querySelector('[name=carrier]').value, tracking: dialog.querySelector('[name=tracking]').value }, x.trackingSaved);
      const set = e.target.closest('[data-set]');
      if (!set || set.dataset.set === o.status) return;
      // Marking "shipped" also saves the tracking number typed above, so the shipping email can include it.
      patch({ status: set.dataset.set, carrier: dialog.querySelector('[name=carrier]').value, tracking: dialog.querySelector('[name=tracking]').value }, L.updated);
    });
    dialog.querySelector('[name=admin_note]').addEventListener('change', (e) => api(`/orders/${id}`, { method: 'PATCH', body: { admin_note: e.target.value } }).then(() => toast(L.noteSaved)));
    dialog.showModal();
  }

  // Products
  async function products() {
    loading(L.nav.products);
    const { products: list } = await api('/products');
    const cat = (id) => {
      const c = state.categories.find((x) => x.id === id);
      return c ? catName(c) : '—';
    };
    shell(
      L.nav.products,
      list.length
        ? `<div class="card flush"><table class="table"><thead><tr><th></th><th>${L.thProduct}</th><th class="hide-sm">${L.thCategory}</th><th>${L.thPrice}</th><th>${L.thStock}</th><th class="hide-sm">${L.thState}</th><th></th></tr></thead><tbody>
      ${list.map((p) => `<tr data-product="${p.id}"><td class="tight"><img class="thumb" src="${esc(JSON.parse(p.images || '[]')[0] || '/assets/placeholder.svg')}" alt=""></td><td><strong>${esc(prodName(p))}</strong>${p.featured ? ` <span class="chip chip-gold">${L.home}</span>` : ''}</td><td class="hide-sm">${esc(cat(p.category_id))}</td><td class="nowrap">${dh(p.price)}</td><td>${p.stock == null ? '<span class="muted">∞</span>' : p.stock <= 3 ? `<span class="chip ${p.stock ? 'chip-warn' : 'chip-bad'}">${p.stock}</span>` : p.stock}</td><td class="hide-sm">${p.active ? `<span class="chip chip-ok">${L.online}</span>` : `<span class="chip">${L.hidden}</span>`}</td><td class="tight"><button type="button" class="icon-btn danger" data-del-product="${p.id}" title="${L.del}" aria-label="${L.del}">${icon('trash', 18)}</button></td></tr>`).join('')}
      </tbody></table></div>`
        : `<div class="card empty">${icon('products', 36)}<p>${L.noProducts}</p></div>`,
      { sub: L.nProducts(list.length), actions: `<button class="btn" data-new>${icon('plus', 18)}<span>${L.add}</span></button>` },
    );
    app.querySelector('[data-new]').addEventListener('click', () => productForm({ active: 1, images: '[]' }));
    app.querySelectorAll('[data-product]').forEach((tr) => tr.addEventListener('click', () => productForm(list.find((p) => p.id === Number(tr.dataset.product)))));
    app.querySelectorAll('[data-del-product]').forEach((btn) =>
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(L.confirmDeleteProduct)) return;
        try {
          await api(`/products/${btn.dataset.delProduct}`, { method: 'DELETE' });
          toast(L.productDeleted);
          products();
        } catch (err) {
          toast(err.message, true);
        }
      }),
    );
  }

  // Rich description editor. Uses the browser's own editing commands; the server cleans the HTML on save.
  const RTE_ICONS = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    ul: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    ol: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4.5h1.5V9M4 9h3M4 14.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2-3 3.5h3"/>',
    left: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    center: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
    right: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
    quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    unlink: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/><path d="m3 3 18 18"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
    video: '<rect x="2.5" y="5" width="14" height="14" rx="2"/><path d="m16.5 10 5-3v10l-5-3"/>',
    embed: '<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8Z"/><path d="m10 15 5-3-5-3z"/>',
    hr: '<path d="M3 12h18"/>',
    clear: '<path d="M4 7V5h12v2M10 5l-3 14M14 19H6"/><path d="m15 13 6 6M21 13l-6 6"/>',
  };
  const rteIcon = (n) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RTE_ICONS[n]}</svg>`;
  function richEditor(l, field = 'desc') {
    const R = L.rte;
    const b = (attrs, label, inner) => `<button type="button" ${attrs} title="${label}" aria-label="${label}">${inner}</button>`;
    return `<div class="rte" data-rte="${l}">
      <div class="rte-label">${LANG_LABEL[l]}</div>
      <div class="rte-bar" role="toolbar" aria-label="${L.description} ${LANG_LABEL[l]}">
        <span class="rte-group">${b('data-cmd="undo"', R.undo, rteIcon('undo'))}${b('data-cmd="redo"', R.redo, rteIcon('redo'))}</span>
        <span class="rte-group"><select data-block aria-label="${R.p}"><option value="p">${R.p}</option><option value="h2">${R.h2}</option><option value="h3">${R.h3}</option></select></span>
        <span class="rte-group">${b('data-cmd="bold"', R.bold, '<b>B</b>')}${b('data-cmd="italic"', R.italic, '<i>I</i>')}${b('data-cmd="underline"', R.underline, '<u>U</u>')}${b('data-cmd="strikeThrough"', R.strike, '<s>S</s>')}
          <label class="rte-color" title="${R.color}"><span>A</span><input type="color" value="#d43f21" data-color aria-label="${R.color}"></label></span>
        <span class="rte-group">${b('data-cmd="insertUnorderedList"', R.ul, rteIcon('ul'))}${b('data-cmd="insertOrderedList"', R.ol, rteIcon('ol'))}${b('data-quote', R.quote, rteIcon('quote'))}</span>
        <span class="rte-group">${b('data-cmd="justifyLeft"', R.left, rteIcon('left'))}${b('data-cmd="justifyCenter"', R.center, rteIcon('center'))}${b('data-cmd="justifyRight"', R.right, rteIcon('right'))}</span>
        <span class="rte-group">${b('data-link', R.link, rteIcon('link'))}${b('data-cmd="unlink"', R.unlink, rteIcon('unlink'))}</span>
        <span class="rte-group rte-media">
          <label title="${R.photo}" aria-label="${R.photo}">${rteIcon('photo')}<input type="file" accept="image/*" multiple hidden data-rte-file></label>
          <label title="${R.video}" aria-label="${R.video}">${rteIcon('video')}<input type="file" accept="video/mp4,video/webm,video/quicktime" multiple hidden data-rte-file></label>
          ${b('data-embed', R.embed, rteIcon('embed'))}</span>
        <span class="rte-group">${b('data-cmd="insertHorizontalRule"', R.hr, rteIcon('hr'))}${b('data-cmd="removeFormat"', R.clear, rteIcon('clear'))}</span>
      </div>
      <div class="rte-media-bar" hidden>
        <span>${R.size}</span><button type="button" data-step="-10" title="${R.smaller}" aria-label="${R.smaller}">−</button>${['25', '50', '75', '100'].map((w) => `<button type="button" data-w="w-${w}">${w}%</button>`).join('')}<button type="button" data-step="10" title="${R.bigger}" aria-label="${R.bigger}">+</button><button type="button" data-reset title="${R.resetShape}" aria-label="${R.resetShape}">↺</button>
        <span class="sep"></span>${[['left', R.alignL], ['center', R.alignC], ['right', R.alignR]].map(([a, t]) => `<button type="button" data-al="al-${a}" title="${t}" aria-label="${t}">${rteIcon(a)}</button>`).join('')}
        <span class="sep"></span><button type="button" class="danger" data-media-del>${icon('trash', 16)}<span>${R.del}</span></button>
      </div>
      <div class="rte-area rich" contenteditable="true" ${dirOf(l)} data-placeholder="${esc(R.placeholder)}"></div>
      <input type="hidden" name="${field}_${l}">
    </div>`;
  }

  function initEditors(f, p, shrink, field = 'desc') {
    const R = L.rte;
    let busy = 0;
    const isRich = (s) => /<\/?(p|br|div|h[2-4]|ul|ol|li|strong|em|b|i|u|s|img|video|figure|iframe|blockquote|span|a|table)\b/i.test(s || '');
    const plainToHtml = (s) => String(s || '').trim().split(/\n\s*\n/).filter(Boolean).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
    const mediaHtml = (m) =>
      m.type === 'embed' ? `<iframe src="${esc(m.url)}" allowfullscreen></iframe>`
      : m.type === 'video' ? `<video src="${esc(m.url)}" controls playsinline preload="metadata"></video>`
      : `<img src="${esc(m.url)}" alt="">`;
    const figureHtml = (m, cls = 'w-100 al-center') => `<figure class="${cls}" contenteditable="false">${mediaHtml(m)}</figure>`;
    let legacy = [];
    try {
      if (field === 'desc') legacy = JSON.parse(p.desc_media || '[]').filter((m) => m && m.url);
    } catch {}
    // YouTube / Vimeo page links become embed links; other https links are treated as an image or a video.
    function fromLink(raw) {
      const u = String(raw || '').trim();
      if (!/^https:\/\//i.test(u)) return null;
      const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
      if (yt) return { type: 'embed', url: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
      const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
      if (vm) return { type: 'embed', url: `https://player.vimeo.com/video/${vm[1]}` };
      if (/\.(mp4|webm|mov)(\?|#|$)/i.test(u)) return { type: 'video', url: u };
      return { type: 'image', url: u };
    }
    async function uploadOne(file) {
      const name = file.name || 'media';
      if (['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
        if (file.size > 5 * 1024 * 1024) throw new Error(L.videoTooBig(name));
        return { type: 'video', url: (await api('/images', { method: 'POST', raw: file })).url };
      }
      if (file.type === 'image/gif') {
        // GIFs are sent as they are so they stay animated.
        const mb = state.r2 ? 5 : 1.8;
        if (file.size > mb * 1024 * 1024) throw new Error(L.gifTooBig(name, mb));
        return { type: 'image', url: (await api('/images', { method: 'POST', raw: file })).url };
      }
      if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(name)) throw new Error(L.notMedia(name));
      let blob;
      try {
        blob = await shrink(file);
      } catch {
        throw new Error(L.notMedia(name));
      }
      if (blob.size > 1024 * 1024) throw new Error(L.photoTooBig(name));
      return { type: 'image', url: (await api('/images', { method: 'POST', raw: blob })).url };
    }

    const list = [...f.querySelectorAll('.rte')].map((root) => {
      const l = root.dataset.rte;
      const area = root.querySelector('.rte-area');
      const input = root.querySelector('input[type=hidden]');
      const mediaBar = root.querySelector('.rte-media-bar');
      const blockSel = root.querySelector('[data-block]');
      let saved = null;
      let selected = null;
      const raw = p[`${field}_${l}`] || '';
      const load = (html) => {
        area.innerHTML = html;
        // Media sits in its own block that the caret can't enter; wrap any loose media the same way.
        area.querySelectorAll('img, video, iframe').forEach((el) => {
          let fig = el.closest('figure');
          if (!fig) {
            fig = document.createElement('figure');
            fig.className = 'w-100 al-center';
            el.replaceWith(fig);
            fig.append(el);
          }
          fig.contentEditable = 'false';
          if (el.tagName === 'VIDEO') el.controls = true;
        });
      };
      load((isRich(raw) ? raw : plainToHtml(raw)) + legacy.map((m) => figureHtml(m)).join(''));

      const restore = () => {
        area.focus();
        const sel = getSelection();
        sel.removeAllRanges();
        if (saved && area.contains(saved.commonAncestorContainer)) sel.addRange(saved);
        else {
          const r = document.createRange();
          r.selectNodeContents(area);
          r.collapse(false);
          sel.addRange(r);
        }
      };
      const exec = (cmd, value = null) => {
        restore();
        document.execCommand('styleWithCSS', false, cmd === 'foreColor');
        document.execCommand(cmd, false, value);
        saved = getSelection().rangeCount ? getSelection().getRangeAt(0).cloneRange() : null;
      };
      const insertHtml = (html) => {
        restore();
        document.execCommand('insertHTML', false, html);
        saved = getSelection().rangeCount ? getSelection().getRangeAt(0).cloneRange() : null;
      };
      // Handles around the selected photo or video: sides change the width, top and bottom the height,
      // corners both. Width is kept in percent on the figure, the shape as an aspect ratio on the media.
      const sizer = document.createElement('div');
      sizer.className = 'rte-sizer';
      sizer.hidden = true;
      sizer.innerHTML = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((h) => `<span class="rte-size-handle h-${h}" data-h="${h}" title="${R.dragSize}"></span>`).join('');
      root.append(sizer);
      const inner = () => {
        const cs = getComputedStyle(area);
        return area.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      };
      const mediaOf = (fig) => fig.querySelector('img, video, iframe');
      const widthOf = (fig) => Math.round((fig.getBoundingClientRect().width / inner()) * 100);
      const SIZES = ['w-25', 'w-50', 'w-75', 'w-100'];
      const setWidth = (fig, w) => {
        w = Math.max(10, Math.min(100, Math.round(w)));
        fig.classList.remove(...SIZES);
        if (w >= 100) {
          fig.classList.add('w-100');
          fig.style.width = '';
        } else fig.style.width = `${w}%`;
        if (!fig.getAttribute('style')) fig.removeAttribute('style');
      };
      const place = () => {
        if (!selected || !selected.isConnected) return (sizer.hidden = true);
        const m = mediaOf(selected) || selected;
        const box = root.getBoundingClientRect();
        const r = m.getBoundingClientRect();
        const a = area.getBoundingClientRect();
        const top = Math.max(r.top, a.top);
        const bottom = Math.min(r.bottom, a.bottom);
        sizer.hidden = false;
        sizer.style.visibility = bottom > top ? '' : 'hidden';
        Object.assign(sizer.style, { top: `${r.top - box.top}px`, left: `${r.left - box.left}px`, width: `${r.width}px`, height: `${r.height}px` });
        sizer.querySelectorAll('.h-n, .h-ne, .h-nw').forEach((x) => (x.style.visibility = r.top >= a.top ? '' : 'hidden'));
        sizer.querySelectorAll('.h-s, .h-se, .h-sw').forEach((x) => (x.style.visibility = r.bottom <= a.bottom ? '' : 'hidden'));
      };
      const select = (fig) => {
        area.querySelectorAll('figure.sel').forEach((x) => x.classList.remove('sel'));
        selected = fig;
        mediaBar.hidden = !fig;
        if (!fig) return (sizer.hidden = true);
        fig.classList.add('sel');
        const custom = Boolean(fig.style.width);
        mediaBar.querySelectorAll('[data-w]').forEach((x) => x.classList.toggle('on', !custom && fig.classList.contains(x.dataset.w)));
        mediaBar.querySelectorAll('[data-al]').forEach((x) => x.classList.toggle('on', fig.classList.contains(x.dataset.al)));
        requestAnimationFrame(place);
      };
      area.addEventListener('scroll', place);
      area.addEventListener('input', place);
      addEventListener('resize', place);
      sizer.querySelectorAll('[data-h]').forEach((handle) =>
        handle.addEventListener('pointerdown', (e) => {
          if (!selected) return;
          e.preventDefault();
          handle.setPointerCapture(e.pointerId);
          const dir = handle.dataset.h;
          const fig = selected;
          const media = mediaOf(fig);
          const start = (media || fig).getBoundingClientRect();
          // A centred photo grows on both sides, a photo floated left or right on one.
          const k = fig.classList.contains('al-left') || fig.classList.contains('al-right') ? 1 : 2;
          const x0 = e.clientX;
          const y0 = e.clientY;
          const move = (ev) => {
            let w = start.width;
            let h = start.height;
            if (dir.includes('e')) w += (ev.clientX - x0) * k;
            if (dir.includes('w')) w -= (ev.clientX - x0) * k;
            if (dir.includes('s')) h += ev.clientY - y0;
            if (dir.includes('n')) h -= ev.clientY - y0;
            w = Math.max(40, Math.min(inner(), w));
            h = Math.max(40, h);
            setWidth(fig, (w / inner()) * 100);
            if (media) media.style.aspectRatio = Math.max(0.2, Math.min(5, w / h)).toFixed(3);
            select(fig);
          };
          const up = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
            handle.removeEventListener('pointercancel', up);
          };
          handle.addEventListener('pointermove', move);
          handle.addEventListener('pointerup', up);
          handle.addEventListener('pointercancel', up);
        }),
      );
      async function addFiles(files) {
        for (const file of files) {
          const id = `up${Math.random().toString(36).slice(2)}`;
          busy++;
          insertHtml(`<figure class="w-100 al-center uploading" contenteditable="false" data-up="${id}"><span class="spinner"></span></figure><p><br></p>`);
          const holder = () => area.querySelector(`[data-up="${id}"]`);
          try {
            const m = await uploadOne(file);
            const h = holder();
            if (h) {
              h.classList.remove('uploading');
              h.removeAttribute('data-up');
              h.innerHTML = mediaHtml(m);
            }
          } catch (err) {
            holder()?.remove();
            toast(err.message || L.uploadFailed(file.name || ''), true);
          }
          busy--;
        }
      }

      document.addEventListener('selectionchange', () => {
        const sel = getSelection();
        if (!sel.rangeCount || !area.contains(sel.anchorNode)) return;
        saved = sel.getRangeAt(0).cloneRange();
        const block = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
        const h = block?.closest('h2, h3');
        blockSel.value = h && area.contains(h) ? h.tagName.toLowerCase() : 'p';
      });
      // Toolbar buttons must not take the focus away from the text.
      root.querySelector('.rte-bar').addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) e.preventDefault();
      });
      root.querySelector('.rte-bar').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.cmd) exec(btn.dataset.cmd);
        else if (btn.hasAttribute('data-quote')) {
          const q = getSelection().anchorNode?.parentElement?.closest('blockquote');
          exec('formatBlock', q && area.contains(q) ? 'p' : 'blockquote');
        }
        else if (btn.hasAttribute('data-link')) {
          const keep = saved;
          const url = prompt(R.linkPrompt, 'https://');
          saved = keep;
          if (!url || url === 'https://') return;
          if (!/^(https?:\/\/|mailto:|tel:)/i.test(url.trim())) return toast(R.badLink, true);
          exec('createLink', url.trim());
        } else if (btn.hasAttribute('data-embed')) {
          const keep = saved;
          const m = fromLink(prompt(R.embedPrompt, 'https://'));
          saved = keep;
          if (!m) return toast(R.badLink, true);
          insertHtml(figureHtml(m) + '<p><br></p>');
        }
      });
      blockSel.addEventListener('change', () => exec('formatBlock', blockSel.value));
      const color = root.querySelector('[data-color]');
      color.addEventListener('input', () => exec('foreColor', color.value));
      root.querySelectorAll('[data-rte-file]').forEach((inp) =>
        inp.addEventListener('change', () => {
          const files = [...inp.files];
          inp.value = '';
          addFiles(files);
        }),
      );
      // Click a photo or video to size, align or delete it.
      area.addEventListener('click', (e) => select(e.target.closest('figure')));
      area.addEventListener('keydown', (e) => {
        if (selected && (e.key === 'Delete' || e.key === 'Backspace')) {
          e.preventDefault();
          selected.remove();
          select(null);
        }
      });
      mediaBar.addEventListener('mousedown', (e) => e.preventDefault());
      mediaBar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !selected) return;
        if (btn.dataset.w) {
          selected.classList.remove(...SIZES);
          selected.classList.add(btn.dataset.w);
          selected.style.width = '';
          if (!selected.getAttribute('style')) selected.removeAttribute('style');
        } else if (btn.dataset.step) {
          setWidth(selected, widthOf(selected) + Number(btn.dataset.step));
        } else if (btn.hasAttribute('data-reset')) {
          const m = mediaOf(selected);
          if (m) {
            m.style.aspectRatio = '';
            if (!m.getAttribute('style')) m.removeAttribute('style');
          }
          setWidth(selected, 100);
        } else if (btn.dataset.al) {
          selected.classList.remove('al-left', 'al-center', 'al-right');
          selected.classList.add(btn.dataset.al);
        } else if (btn.hasAttribute('data-media-del')) {
          selected.remove();
          return select(null);
        }
        select(selected);
      });
      document.addEventListener('click', (e) => {
        if (selected && !root.contains(e.target)) select(null);
      });
      // Drop or paste files straight into the text.
      area.addEventListener('dragover', (e) => {
        if ([...e.dataTransfer.types].includes('Files')) e.preventDefault();
      });
      area.addEventListener('drop', (e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        const pos = document.caretRangeFromPoint?.(e.clientX, e.clientY);
        const cp = !pos && document.caretPositionFromPoint?.(e.clientX, e.clientY);
        if (pos) saved = pos;
        else if (cp) {
          saved = document.createRange();
          saved.setStart(cp.offsetNode, cp.offset);
        }
        addFiles([...e.dataTransfer.files]);
      });
      area.addEventListener('paste', (e) => {
        const files = [...(e.clipboardData?.files || [])];
        if (!files.length) return;
        e.preventDefault();
        addFiles(files);
      });

      const value = () => {
        const clone = area.cloneNode(true);
        clone.querySelectorAll('.uploading').forEach((x) => x.remove());
        clone.querySelectorAll('[contenteditable]').forEach((x) => x.removeAttribute('contenteditable'));
        clone.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel'));
        const empty = !clone.textContent.trim() && !clone.querySelector('img, video, iframe, hr, table');
        return empty ? '' : clone.innerHTML;
      };
      return {
        lang: l,
        sync: () => (input.value = value()),
        text: () => area.innerText.trim(),
        set: (html) => {
          load(html);
          input.value = value();
        },
      };
    });
    document.execCommand('defaultParagraphSeparator', false, 'p');
    return {
      busy: () => busy > 0,
      sync: () => list.forEach((x) => x.sync()),
      text: (l) => list.find((x) => x.lang === l)?.text() || '',
      set: (l, html) => list.find((x) => x.lang === l)?.set(html),
    };
  }

  // Uploads: each photo is shrunk in the browser (longest side 1600 px, WebP or JPEG) and sent as it is.
  async function shrink(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const encode = (type, q) => new Promise((r) => canvas.toBlob(r, type, q));
    let blob = await encode('image/webp', 0.84);
    if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.85); // Safari without WebP encoding
    for (let q = 0.75; blob.size > 0.95 * 1024 * 1024 && q > 0.4; q -= 0.15) blob = await encode(blob.type, q);
    return blob;
  }

  // products.options holds the list of groups, or { groups, bundles } when the product has quantity offers.
  function parseBundles(raw) {
    const text = String(raw || '').trim();
    if (!text.startsWith('{')) return [];
    try {
      return (JSON.parse(text).bundles || []).map((b) => ({ qty: b.qty, price: (b.price || 0) / 100, label: { de: '', en: '', ar: '', ...b.label }, hot: Boolean(b.hot) }));
    } catch {
      return [];
    }
  }
  // The product's own "pieces left in the offer" number, or '' when it uses the one from the settings.
  function parseLeft(raw) {
    const text = String(raw || '').trim();
    if (!text.startsWith('{')) return '';
    try {
      const n = JSON.parse(text).left;
      return Number.isInteger(n) && n >= 0 ? n : '';
    } catch {
      return '';
    }
  }
  function parseOptions(raw) {
    let text = String(raw || '').trim();
    if (!text) return [];
    if (text.startsWith('{')) {
      try {
        text = JSON.stringify(JSON.parse(text).groups || []);
      } catch {
        return [];
      }
    }
    if (text.startsWith('[')) {
      try {
        return JSON.parse(text).map((g) => ({ name: { de: '', en: '', ar: '', ...g.name }, type: g.type === 'color' ? 'color' : 'text', values: (g.values || []).map((v) => ({ label: v.label || '', price: (v.price || 0) / 100, color: v.color || '#cccccc' })) }));
      } catch {
        return [];
      }
    }
    return [{ name: { de: '', en: '', ar: '' }, type: 'text', values: text.split(',').map((x) => x.trim()).filter(Boolean).map((label) => ({ label, price: 0 })) }];
  }
  function productForm(p) {
    const x = XL();
    const images = JSON.parse(p.images || '[]');
    // Prices are cents in the database and euros ("16,90") in the form.
    p = { ...p, price: toInput(p.price), compare_price: toInput(p.compare_price), unit_amount: p.unit_amount == null ? '' : String(p.unit_amount).replace('.', ',') };
    const field = (name, label, attrs = '') => `<label>${label}<input name="${name}" value="${esc(p[name] ?? '')}" ${attrs}></label>`;
    shell(
      p.id ? L.editProduct : L.newProduct,
      `<form class="form" id="pform">
      <div class="card"><h2>${L.name}</h2><div class="cols3">
        ${contentLangs().map((l) => field(`name_${l}`, LANG_LABEL[l], dirOf(l))).join('')}
      </div></div>
      <div class="card"><h2>${x.subtitle}</h2><div class="cols3">
        ${contentLangs().map((l) => field(`subtitle_${l}`, LANG_LABEL[l], `${dirOf(l)} maxlength="160"`)).join('')}
      </div></div>
      <div class="card"><h2>${L.priceStock}</h2><div class="cols">
        ${field('price', x.priceEur, 'required inputmode="decimal" dir="ltr" placeholder="16,90" pattern="[0-9]+([.,][0-9]{1,2})?"')}
        ${field('compare_price', x.compareEur, 'inputmode="decimal" dir="ltr" pattern="[0-9]+([.,][0-9]{1,2})?"')}
        ${field('unit_amount', x.unitAmount, 'inputmode="decimal" dir="ltr" placeholder="100"')}
        <label>${x.unitType}<select name="unit_type"><option value="">—</option><option value="ml"${p.unit_type === 'ml' ? ' selected' : ''}>ml</option><option value="g"${p.unit_type === 'g' ? ' selected' : ''}>g</option></select></label>
        ${field('stock', L.stock, 'type="number" min="0" step="1" inputmode="numeric"')}
        <label>${L.category}<select name="category_id"><option value="">—</option>${state.categories.map((c) => `<option value="${c.id}"${c.id === p.category_id ? ' selected' : ''}>${esc(catName(c))}</option>`).join('')}</select></label>
      </div>
      </div>
      <div class="card"><h2>${L.options}</h2>
        <p class="muted small">${L.opt.hint}</p>
        <div id="opts"></div>
        <div class="actions opt-add">
          <button type="button" class="btn ghost" data-opt-add="color"><span class="swatch-ico"></span>${L.opt.color}</button>
          <button type="button" class="btn ghost" data-opt-add="size">${icon('plus', 18)}<span>${L.opt.size}</span></button>
          <button type="button" class="btn ghost" data-opt-add="other">${icon('plus', 18)}<span>${L.opt.other}</span></button>
        </div>
      </div>
      <div class="card"><h2>${L.offers}</h2>
        <p class="muted small">${L.bun.hint}</p>
        <div id="bundles"></div>
        <div class="actions"><button type="button" class="btn ghost" data-bun-add>${icon('plus', 18)}<span>${L.bun.add}</span></button></div>
      </div>
      <div class="card"><h2>${L.photos}</h2>
        <div class="photos" id="photos"></div>
        <div class="drop" id="drop">
          <p><strong>${L.dropHere}</strong><br><span class="muted small">${L.dropHint}</span></p>
          <div class="actions">
            <label class="btn">${icon('plus', 18)}<span>${L.addPhotos}</span><input type="file" accept="image/*" multiple hidden data-pick></label>
            <label class="btn ghost camera">${icon('camera', 18)}<span>${L.takePhoto}</span><input type="file" accept="image/*" capture="environment" hidden data-pick></label>
          </div>
        </div>
        <details${images.some((u) => /^https?:/.test(u)) ? ' open' : ''}><summary class="muted small">${L.pasteLinks}</summary>
        <label>${L.photoLinks}<textarea name="images" rows="2" dir="ltr">${esc(images.join('\n'))}</textarea></label></details>
      </div>
      <div class="card"><h2>${L.description}</h2><p class="muted small">${L.rte.hint}</p>
        <details class="ai-box"><summary>✨ ${L.ai.title}</summary>
          <p class="muted small">${L.ai.hint}</p>
          <label>${L.ai.notes}<textarea name="ai_notes" rows="5" dir="auto" placeholder="${esc(L.ai.notesPh)}"></textarea></label>
          <div class="ai-row">
            <label class="switch"><input type="checkbox" name="ai_names"><span></span> ${L.ai.alsoNames}</label>
          </div>
          <button type="button" class="btn ai-go" data-ai>✨ <span>${L.ai.go}</span></button>
          ${state.ai ? '' : `<p class="ai-warn small">${L.ai.noKey}</p>`}
          <p class="muted small">${L.ai.review}</p>
        </details>
        ${contentLangs().map((l) => richEditor(l)).join('')}
        <input type="hidden" name="desc_media" value="[]">
      </div>
      <div class="card"><h2>${x.usage}</h2>
        ${contentLangs().map((l) => `<label>${LANG_LABEL[l]}<textarea name="usage_${l}" rows="3" ${dirOf(l)}>${esc(p[`usage_${l}`] || '')}</textarea></label>`).join('')}
      </div>
      <div class="card"><h2>${x.ingredients}</h2><p class="muted small">${x.ingredientsHint}</p>
        <label>INCI<textarea name="ingredients" rows="3" dir="ltr">${esc(p.ingredients || '')}</textarea></label>
      </div>
      <div class="card"><h2>${L.display}</h2><div class="cols">
        ${field('slug', L.slug, `placeholder="${L.auto}" dir="ltr"`)}
        ${field('sort', L.sort, 'type="number" step="1"')}
      </div>
      <label class="switch"><input type="checkbox" name="featured"${p.featured ? ' checked' : ''}><span></span> ${L.featured}</label>
      <label class="switch"><input type="checkbox" name="active"${p.active ? ' checked' : ''}><span></span> ${L.active}</label></div>
      <div class="sticky-actions"><button type="button" class="btn ghost" data-back>${L.cancel}</button>${p.id ? `<a class="btn ghost hide-sm" href="/${lang}/p/${esc(p.slug)}" target="_blank" rel="noopener">${L.view}</a><button type="button" class="btn danger" data-delete>${L.del}</button>` : ''}<button class="btn">${L.save}</button></div>
    </form>`,
    );
    const f = document.getElementById('pform');
    const list = () => f.images.value.split('\n').map((x) => x.trim()).filter(Boolean);
    const setList = (arr) => {
      f.images.value = arr.join('\n');
      drawPhotos();
    };
    let pending = []; // {id, name, preview} while uploading
    let dragFrom = null;
    const drawPhotos = () => {
      const urls = list();
      document.getElementById('photos').innerHTML =
        urls
          .map(
            (u, i) => `<figure draggable="true" data-i="${i}">${i === 0 ? `<span class="main-badge">${L.mainPhoto}</span>` : ''}<img src="${esc(u)}" alt="" loading="lazy">
            <div class="tile-actions">${i > 0 ? `<button type="button" data-move="${i}" data-by="-1" title="${L.moveBefore}" aria-label="${L.moveBefore}">${icon('chevron', 16)}</button>` : '<span></span>'}<button type="button" data-rm="${i}" title="${L.remove}" aria-label="${L.remove}">✕</button>${i < urls.length - 1 ? `<button type="button" data-move="${i}" data-by="1" class="flip" title="${L.moveAfter}" aria-label="${L.moveAfter}">${icon('chevron', 16)}</button>` : '<span></span>'}</div></figure>`,
          )
          .join('') + pending.map((x) => `<figure class="uploading"><img src="${x.preview}" alt=""><span class="spinner"></span></figure>`).join('');
    };
    drawPhotos();
    f.images.addEventListener('input', drawPhotos);
    f.addEventListener('click', async (e) => {
      if (e.target.closest('[data-back]')) products();
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        const arr = list();
        arr.splice(Number(rm.dataset.rm), 1);
        setList(arr);
      }
      const mv = e.target.closest('[data-move]');
      if (mv) {
        const arr = list();
        const i = Number(mv.dataset.move);
        const j = i + Number(mv.dataset.by);
        [arr[i], arr[j]] = [arr[j], arr[i]];
        setList(arr);
      }
      if (e.target.closest('[data-delete]') && confirm(L.confirmDeleteProduct)) {
        try {
          await api(`/products/${p.id}`, { method: 'DELETE' });
          toast(L.productDeleted);
          products();
        } catch (err) {
          toast(err.message, true);
        }
      }
    });
    // Drag tiles to reorder them.
    const grid = document.getElementById('photos');
    grid.addEventListener('dragstart', (e) => {
      const fig = e.target.closest('figure[data-i]');
      if (fig) dragFrom = Number(fig.dataset.i);
    });
    grid.addEventListener('dragover', (e) => {
      if (dragFrom != null) e.preventDefault();
    });
    grid.addEventListener('drop', (e) => {
      const fig = e.target.closest('figure[data-i]');
      if (dragFrom == null || !fig) return;
      e.preventDefault();
      const arr = list();
      const [moved] = arr.splice(dragFrom, 1);
      arr.splice(Number(fig.dataset.i), 0, moved);
      dragFrom = null;
      setList(arr);
    });
    grid.addEventListener('dragend', () => (dragFrom = null));

    async function upload(files) {
      const jobs = [...files].map((file) => ({ file, id: Math.random(), name: file.name || 'photo', preview: URL.createObjectURL(file) }));
      pending.push(...jobs);
      drawPhotos();
      const next = async () => {
        const job = jobs.shift();
        if (!job) return;
        try {
          if (!job.file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(job.name)) throw new Error(L.notImage(job.name));
          let blob;
          try {
            blob = await shrink(job.file);
          } catch {
            throw new Error(L.notImage(job.name));
          }
          const { url } = await api('/images', { method: 'POST', raw: blob });
          f.images.value = [...list(), url].join('\n');
        } catch (err) {
          toast(err.message || L.uploadFailed(job.name), true);
        }
        pending = pending.filter((x) => x.id !== job.id);
        URL.revokeObjectURL(job.preview);
        drawPhotos();
        await next();
      };
      await Promise.all([next(), next(), next()]);
    }
    f.querySelectorAll('[data-pick]').forEach((input) =>
      input.addEventListener('change', () => {
        upload(input.files);
        input.value = '';
      }),
    );
    const drop = document.getElementById('drop');
    ['dragenter', 'dragover'].forEach((t) =>
      drop.addEventListener(t, (e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        drop.classList.add('over');
      }),
    );
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
    drop.addEventListener('drop', (e) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      upload(e.dataTransfer.files);
    });
    // Description editors (one per language): Word-like text with photos, GIFs, videos and embeds.
    const editors = initEditors(f, p, shrink);
    // AI description writer: Claude reads the photos and the notes, writes the three languages,
    // and the result goes into the editors for the seller to check before saving.
    const aiBtn = f.querySelector('[data-ai]');
    aiBtn.addEventListener('click', async () => {
      const filled = contentLangs().some((l) => editors.text(l));
      if (filled && !confirm(L.ai.replace)) return;
      const notes = f.ai_notes.value.trim() || contentLangs().map((l) => editors.text(l)).filter(Boolean)[0] || '';
      const names = Object.fromEntries(['ar', 'fr', 'en'].map((l) => [l, f[`name_${l}`]?.value || '']));
      const label = aiBtn.querySelector('span');
      aiBtn.disabled = true;
      label.textContent = L.ai.working;
      try {
        const r = await api('/ai/describe', { method: 'POST', body: { names, notes, images: list().slice(0, 4) } });
        contentLangs().forEach((l) => r.desc[l] && editors.set(l, r.desc[l]));
        if (f.ai_names.checked) contentLangs().forEach((l) => r.names[l] && f[`name_${l}`] && (f[`name_${l}`].value = r.names[l]));
        toast(L.ai.done);
        f.querySelector('.rte')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        if (err.message !== 'unauthorized') toast(err.message, true);
      } finally {
        aiBtn.disabled = false;
        label.textContent = L.ai.go;
      }
    });
    // Options builder (colours, sizes…). Saved as JSON; older products with "S, M, L" open as one group.
    const opts = parseOptions(p.options);
    const optsBox = document.getElementById('opts');
    const drawOpts = () => {
      optsBox.innerHTML = opts
        .map(
          (g, gi) => `<div class="opt-group" data-g="${gi}">
          <div class="opt-head">
            <div class="cols3">${contentLangs().map((l) => `<label>${L.opt.groupName} · ${LANG_LABEL[l]}<input data-k="name" data-l="${l}" value="${esc(g.name[l] || '')}" ${dirOf(l)} maxlength="40"></label>`).join('')}</div>
            <div class="opt-tools"><label>${L.opt.type}<select data-k="type"><option value="text"${g.type !== 'color' ? ' selected' : ''}>${L.opt.typeText}</option><option value="color"${g.type === 'color' ? ' selected' : ''}>${L.opt.typeColor}</option></select></label>
            <button type="button" class="btn ghost danger-text" data-opt-del>${L.opt.removeGroup}</button></div>
          </div>
          <div class="opt-values">
            <div class="opt-row opt-labels${g.type === 'color' ? ' has-color' : ''}">${g.type === 'color' ? '<span></span>' : ''}<span>${L.opt.value}</span><span>${XL().extraEur}</span><span></span></div>
            ${g.values
              .map(
                (v, vi) => `<div class="opt-row${g.type === 'color' ? ' has-color' : ''}" data-v="${vi}">
                ${g.type === 'color' ? `<input type="color" data-k="color" value="${esc(v.color || '#cccccc')}" aria-label="${L.opt.colorName}">` : ''}
                <input data-k="label" value="${esc(v.label)}" placeholder="${L.opt.valuePh}" maxlength="40" aria-label="${L.opt.value}">
                <input data-k="price" inputmode="decimal" value="${v.price ? String(v.price).replace('.', ',') : ''}" placeholder="0,00" aria-label="${XL().extraEur}" dir="ltr">
                <button type="button" class="x" data-val-del title="${L.remove}" aria-label="${L.remove}">✕</button>
              </div>`,
              )
              .join('')}
          </div>
          <button type="button" class="btn ghost small" data-val-add>${icon('plus', 16)}<span>${L.opt.addValue}</span></button>
        </div>`,
        )
        .join('');
    };
    drawOpts();
    // Quantity offers builder.
    const bundles = parseBundles(p.options);
    const bunBox = document.getElementById('bundles');
    const basePrice = () => eur(f.price.value);
    const bunNote = (b) => {
      const was = basePrice() * (b.qty || 0);
      if (!b.qty || !b.price || !was) return '';
      return b.price < was ? `<span class="bun-save">${L.bun.save(dh(Math.round((was - b.price) * 100)))}</span>` : `<span class="bun-warn">${L.bun.notCheaper}</span>`;
    };
    const drawBundles = () => {
      bunBox.innerHTML = bundles
        .map(
          (b, bi) => `<div class="bun" data-b="${bi}">
          <div class="bun-row">
            <label>${L.bun.qty}<input data-k="qty" type="number" min="2" max="20" step="1" inputmode="numeric" value="${b.qty || ''}" dir="ltr"></label>
            <label>${x.bunEur}<input data-k="price" inputmode="decimal" value="${b.price ? String(b.price).replace('.', ',') : ''}" dir="ltr"></label>
            <label class="switch"><input type="checkbox" data-k="hot"${b.hot ? ' checked' : ''}><span></span> ${L.bun.hot}</label>
            <button type="button" class="x" data-bun-del title="${L.remove}" aria-label="${L.remove}">✕</button>
          </div>
          <p class="bun-note small" data-bun-note>${bunNote(b)}</p>
          <details${contentLangs().some((l) => b.label[l]) ? ' open' : ''}><summary class="muted small">${L.bun.title}</summary>
            <div class="cols3">${contentLangs().map((l) => `<label>${LANG_LABEL[l]}<input data-k="label" data-l="${l}" value="${esc(b.label[l] || '')}" placeholder="${L.bun.titlePh}" ${dirOf(l)} maxlength="60"></label>`).join('')}</div>
          </details>
        </div>`,
        )
        .join('');
    };
    drawBundles();
    const refreshNotes = () => bunBox.querySelectorAll('[data-b]').forEach((el) => (el.querySelector('[data-bun-note]').innerHTML = bunNote(bundles[Number(el.dataset.b)])));
    f.price.addEventListener('input', refreshNotes);
    bunBox.addEventListener('input', (e) => {
      const el = e.target;
      const b = bundles[Number(el.closest('[data-b]')?.dataset.b)];
      if (!b) return;
      if (el.dataset.k === 'qty') b.qty = Math.round(Number(el.value) || 0);
      else if (el.dataset.k === 'price') b.price = eur(el.value);
      else if (el.dataset.k === 'hot') b.hot = el.checked;
      else if (el.dataset.k === 'label') b.label[el.dataset.l] = el.value;
      refreshNotes();
    });
    bunBox.addEventListener('change', (e) => {
      if (e.target.dataset.k !== 'hot' || !e.target.checked) return;
      // Only one offer is "most popular".
      bundles.forEach((b, i) => (b.hot = i === Number(e.target.closest('[data-b]').dataset.b)));
      drawBundles();
    });
    f.addEventListener('click', (e) => {
      if (e.target.closest('[data-bun-add]')) {
        const last = bundles[bundles.length - 1];
        const qty = Math.min(20, last ? last.qty + 1 : 2);
        bundles.push({ qty, price: 0, label: { de: '', en: '', ar: '' }, hot: false });
        drawBundles();
        bunBox.querySelector(`[data-b="${bundles.length - 1}"] [data-k="price"]`)?.focus();
      } else if (e.target.closest('[data-bun-del]')) {
        bundles.splice(Number(e.target.closest('[data-b]').dataset.b), 1);
        drawBundles();
      }
    });
    optsBox.addEventListener('input', (e) => {
      const el = e.target;
      const g = opts[Number(el.closest('[data-g]')?.dataset.g)];
      if (!g) return;
      const v = g.values[Number(el.closest('[data-v]')?.dataset.v)];
      if (el.dataset.k === 'name') g.name[el.dataset.l] = el.value;
      else if (el.dataset.k === 'type') {
        g.type = el.value;
        drawOpts();
      } else if (v && el.dataset.k === 'label') v.label = el.value;
      else if (v && el.dataset.k === 'price') v.price = eur(el.value);
      else if (v && el.dataset.k === 'color') v.color = el.value;
    });
    f.addEventListener('click', (e) => {
      const add = e.target.closest('[data-opt-add]');
      const gEl = e.target.closest('[data-g]');
      const g = gEl && opts[Number(gEl.dataset.g)];
      if (add) {
        const kind = add.dataset.optAdd;
        const names = {
          color: { ar: 'اللون', de: 'Farbe', en: 'Color' },
          size: { ar: 'الحجم', de: 'Größe', en: 'Size' },
          other: { de: '', en: '', ar: '' },
        };
        const values = kind === 'size' ? ['S', 'M', 'L', 'XL'].map((label) => ({ label, price: 0 })) : [{ label: '', price: 0, color: '#000000' }];
        opts.push({ name: names[kind], type: kind === 'color' ? 'color' : 'text', values });
        drawOpts();
        optsBox.querySelector(`[data-g="${opts.length - 1}"] [data-k="${kind === 'other' ? 'name' : 'label'}"]`)?.focus();
      } else if (g && e.target.closest('[data-opt-del]')) {
        opts.splice(Number(gEl.dataset.g), 1);
        drawOpts();
      } else if (g && e.target.closest('[data-val-add]')) {
        g.values.push({ label: '', price: 0, color: '#000000' });
        drawOpts();
        const rows = optsBox.querySelectorAll(`[data-g="${gEl.dataset.g}"] [data-k="label"]`);
        rows[rows.length - 1]?.focus();
      } else if (g && e.target.closest('[data-val-del]')) {
        g.values.splice(Number(e.target.closest('[data-v]').dataset.v), 1);
        drawOpts();
      }
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (pending.length || editors.busy()) return toast(L.waitUploads, true);
      editors.sync();
      const data = Object.fromEntries(new FormData(f));
      data.featured = f.featured.checked;
      data.active = f.active.checked;
      const groups = opts.map((g) => ({ ...g, values: g.values.filter((v) => v.label.trim()) }));
      if (groups.some((g) => !g.values.length)) return toast(L.opt.needValue, true);
      data.options = JSON.stringify(groups.map((g) => ({ ...g, values: g.values.map((v) => ({ ...v, price: Math.round((v.price || 0) * 100) })) })));
      data.price = Math.round(eur(data.price) * 100);
      data.compare_price = data.compare_price ? Math.round(eur(data.compare_price) * 100) : '';
      const qtys = bundles.map((b) => b.qty);
      if (bundles.some((b) => !(b.qty >= 2 && b.qty <= 20) || !(b.price > 0)) || new Set(qtys).size !== qtys.length) return toast(L.bun.bad, true);
      data.bundles = bundles.map((b) => ({ ...b, price: Math.round(b.price * 100) }));
      try {
        await api(p.id ? `/products/${p.id}` : '/products', { method: p.id ? 'PUT' : 'POST', body: data });
        toast(L.productSaved);
        products();
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  // Categories
  // Blog: articles bring visitors from Google whatever products are in the shop.
  const postTitle = (x) => pick(x, 'title') || '—';
  async function blog() {
    loading(L.nav.blog);
    const B = L.blog;
    const { posts: list } = await api('/posts');
    shell(
      L.nav.blog,
      list.length
        ? `<div class="card flush"><table class="table"><thead><tr><th></th><th>${B.postTitle}</th><th class="hide-sm">${B.date}</th><th class="hide-sm">${L.thState}</th><th></th></tr></thead><tbody>
      ${list.map((x) => `<tr data-post="${x.id}"><td class="tight"><img class="thumb" src="${esc(x.cover || '/assets/placeholder.svg')}" alt=""></td><td><strong>${esc(postTitle(x))}</strong><small dir="ltr">/blog/${esc(x.slug)}</small></td><td class="hide-sm nowrap">${esc(String(x.created_at).slice(0, 10))}</td><td class="hide-sm">${x.published ? `<span class="chip chip-ok">${L.online}</span>` : `<span class="chip">${L.hidden}</span>`}</td><td class="tight"><button type="button" class="icon-btn danger" data-del-post="${x.id}" title="${L.del}" aria-label="${L.del}">${icon('trash', 18)}</button></td></tr>`).join('')}
      </tbody></table></div>`
        : `<div class="card empty">${icon('blog', 36)}<p>${B.noPosts}</p></div>`,
      { sub: B.count(list.length), actions: `<button class="btn" data-new>${icon('plus', 18)}<span>${B.newPost}</span></button>` },
    );
    app.querySelector('[data-new]').addEventListener('click', () => postForm({ published: 1 }));
    app.querySelectorAll('[data-post]').forEach((tr) => tr.addEventListener('click', () => postForm(list.find((x) => x.id === Number(tr.dataset.post)))));
    app.querySelectorAll('[data-del-post]').forEach((btn) =>
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(B.confirmDelete)) return;
        try {
          await api(`/posts/${btn.dataset.delPost}`, { method: 'DELETE' });
          toast(B.deleted);
          blog();
        } catch (err) {
          toast(err.message, true);
        }
      }),
    );
  }

  function postForm(p) {
    const B = L.blog;
    const field = (name, label, attrs = '') => `<label>${label}<input name="${name}" value="${esc(p[name] ?? '')}" ${attrs}></label>`;
    const area = (name, label, attrs = '') => `<label>${label}<textarea name="${name}" rows="2" maxlength="300" ${attrs}>${esc(p[name] ?? '')}</textarea></label>`;
    shell(
      p.id ? B.editPost : B.newPost,
      `<form class="form" id="postform">
      <div class="card"><h2>${B.postTitle}</h2><div class="cols3">${contentLangs().map((l) => field(`title_${l}`, LANG_LABEL[l], `${dirOf(l)} maxlength="200"`)).join('')}</div></div>
      <div class="card"><h2>${B.excerpt}</h2><p class="muted small">${B.excerptHint}</p>${contentLangs().map((l) => area(`excerpt_${l}`, LANG_LABEL[l], dirOf(l))).join('')}</div>
      <div class="card"><h2>${B.cover}</h2><p class="muted small">${B.coverHint}</p>
        <div class="cover-row"><img class="cover-preview" src="${esc(p.cover || '/assets/placeholder.svg')}" alt="">
          <label class="btn ghost">${icon('camera', 18)}<span>${B.uploadCover}</span><input type="file" accept="image/*" hidden data-cover></label></div>
        ${field('cover', B.coverLink, 'dir="ltr" placeholder="https://…"')}
      </div>
      <div class="card"><h2>${B.body}</h2><p class="muted small">${L.rte.hint}</p>${contentLangs().map((l) => richEditor(l, 'body')).join('')}</div>
      <div class="card"><h2>${L.display}</h2>${field('slug', L.slug, `placeholder="${L.auto}" dir="ltr"`)}
        <label class="switch"><input type="checkbox" name="published"${p.published ? ' checked' : ''}><span></span> ${B.published}</label></div>
      <div class="sticky-actions"><button type="button" class="btn ghost" data-back>${L.cancel}</button>${p.id ? `<a class="btn ghost hide-sm" href="/${lang}/blog/${esc(p.slug)}" target="_blank" rel="noopener">${L.view}</a><button type="button" class="btn danger" data-delete>${L.del}</button>` : ''}<button class="btn">${L.save}</button></div>
    </form>`,
    );
    const f = document.getElementById('postform');
    const editors = initEditors(f, p, shrink, 'body');
    const preview = f.querySelector('.cover-preview');
    f.cover.addEventListener('input', () => (preview.src = f.cover.value.trim() || '/assets/placeholder.svg'));
    let coverBusy = false;
    f.querySelector('[data-cover]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      coverBusy = true;
      preview.style.opacity = 0.4;
      try {
        const { url } = await api('/images', { method: 'POST', raw: await shrink(file) });
        f.cover.value = url;
        preview.src = url;
      } catch (err) {
        toast(err.message || L.uploadFailed(file.name || ''), true);
      }
      coverBusy = false;
      preview.style.opacity = 1;
    });
    f.addEventListener('click', async (e) => {
      if (e.target.closest('[data-back]')) blog();
      if (e.target.closest('[data-delete]') && confirm(B.confirmDelete)) {
        try {
          await api(`/posts/${p.id}`, { method: 'DELETE' });
          toast(B.deleted);
          blog();
        } catch (err) {
          toast(err.message, true);
        }
      }
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (coverBusy || editors.busy()) return toast(L.waitUploads, true);
      editors.sync();
      const data = Object.fromEntries(new FormData(f));
      data.published = f.published.checked;
      try {
        await api(p.id ? `/posts/${p.id}` : '/posts', { method: p.id ? 'PUT' : 'POST', body: data });
        toast(B.saved);
        blog();
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  async function categories() {
    state.categories = (await api('/categories')).categories;
    const cols = contentLangs();
    const card = (c) => `<form class="card cat-card${c.id ? '' : ' new-cat'}" data-cat="${c.id || ''}">
        ${c.id ? '' : `<h2>${L.newCategory}</h2>`}
        <div class="cat-grid">
          <div class="cat-cover">
            <label class="cat-pic" title="${L.catUpload}"><img src="${esc(c.image || '/assets/placeholder.svg')}" alt=""><span class="cat-pic-btn">${icon('camera', 18)}<span>${c.image ? L.catChange : L.catUpload}</span></span><input type="file" accept="image/*" hidden data-cover></label>
            <button type="button" class="link small" data-remove-cover${c.image ? '' : ' hidden'}>${L.catRemove}</button>
          </div>
          <div class="cat-fields">
            <p class="muted small">${L.catCoverHint}</p>
            <div class="cols3">${cols.map((l) => `<label>${LANG_LABEL[l]}<input name="name_${l}" ${dirOf(l)} value="${esc(c[`name_${l}`] || '')}"></label>`).join('')}</div>
            <details class="cat-more"${c.image && !c.image.startsWith('/img/') ? ' open' : ''}><summary>${L.catLink}</summary><input name="image" dir="ltr" value="${esc(c.image || '')}" placeholder="https://…"></details>
            <div class="cat-foot"><label class="cat-sort">${L.thSort}<input name="sort" type="number" value="${c.id ? c.sort : 0}" class="num"></label>${c.id ? `<span class="muted small">${L.thProducts}: <b>${c.products}</b></span>` : ''}
              <span class="grow"></span>${c.id ? `<button type="button" class="link danger" data-del>${L.del}</button>` : ''}<button class="btn small">${c.id ? L.save : L.add}</button></div>
          </div>
        </div>
      </form>`;
    shell(L.nav.categories, `<div class="cat-list">${state.categories.map(card).join('')}${card({})}</div>`, { sub: L.catsSub });
    app.querySelectorAll('[data-cat]').forEach((f) => {
      const id = f.dataset.cat;
      const img = f.querySelector('.cat-pic img');
      const btnText = f.querySelector('.cat-pic-btn span');
      const remove = f.querySelector('[data-remove-cover]');
      let busy = false;
      const show = (url) => {
        img.src = url || '/assets/placeholder.svg';
        btnText.textContent = url ? L.catChange : L.catUpload;
        remove.hidden = !url;
      };
      f.image.addEventListener('input', () => show(f.image.value.trim()));
      remove.addEventListener('click', () => {
        f.image.value = '';
        show('');
      });
      f.querySelector('[data-cover]').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        busy = true;
        f.classList.add('uploading');
        try {
          const { url } = await api('/images', { method: 'POST', raw: await shrink(file) });
          f.image.value = url;
          show(url);
        } catch (err) {
          toast(err.message || L.uploadFailed(file.name || ''), true);
        }
        busy = false;
        f.classList.remove('uploading');
      });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return toast(L.waitUploads, true);
        const data = Object.fromEntries([...f.querySelectorAll('input[name]')].map((i) => [i.name, i.value]));
        if (id) data.slug = state.categories.find((c) => c.id === Number(id)).slug;
        try {
          await api(id ? `/categories/${id}` : '/categories', { method: id ? 'PUT' : 'POST', body: data });
          toast(L.catSaved);
          categories();
        } catch (err) {
          toast(err.message, true);
        }
      });
      f.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (!confirm(L.confirmDeleteCat)) return;
        try {
          await api(`/categories/${id}`, { method: 'DELETE' });
          categories();
        } catch (err) {
          toast(err.message, true);
        }
      });
    });
  }

  // Settings
  function settings() {
    const s = state.settings;
    const x = XL();
    const rates = (() => { try { return Object.entries(JSON.parse(s.shipping_rates || '{}')).map(([c, v]) => `${c}=${toInput(v)}`).join('\n'); } catch { return ''; } })();
    const money = (k, label) => `<label>${label}<input name="${k}" value="${esc(toInput(s[k] ?? ''))}" inputmode="decimal" dir="ltr"></label>`;
    const sw = (k, label, on = s[k] !== '0') => `<label class="switch"><input type="checkbox" name="${k}"${on ? ' checked' : ''}><span></span> ${label}</label>`;
    const field = (k, label, attrs = '') => `<label>${label}<input name="${k}" value="${esc(s[k] ?? '')}" ${attrs}></label>`;
    const steps = `<ol class="howto">${L.steps.map((x) => `<li>${x}</li>`).join('')}</ol>`;
    shell(
      L.nav.settings,
      `<form class="form" id="sform">
      <div class="card"><h2>${L.store}</h2><div class="cols">
        ${field('store_name', L.storeName, 'required')}
        ${field('whatsapp', L.whatsapp, 'inputmode="tel" dir="ltr" placeholder="4917680278899"')}
        ${field('phone', x.phoneLabel, 'dir="ltr"')}
        ${field('contact_email', L.contactEmail, 'type="email" dir="ltr"')}
        ${field('founder_photo', x.founderPhoto, 'dir="ltr" placeholder="/img/…"')}
      </div></div>
      <div class="card"><div class="card-head"><h2>${x.pay}</h2><span class="chip ${state.paypal ? 'chip-ok' : 'chip-warn'}">${state.paypal ? x.paypalOn : x.paypalOff}</span></div><p class="muted small">${x.payHint}</p>
        ${sw('pay_paypal', x.payPaypal)}${sw('pay_bank', x.payBank)}${sw('pay_cod', x.payCod)}
        <div class="cols">${money('cod_fee', x.codFeeEur)}<label>${x.paypalMode}<select name="paypal_mode"><option value="sandbox"${s.paypal_mode !== 'live' ? ' selected' : ''}>${x.sandbox}</option><option value="live"${s.paypal_mode === 'live' ? ' selected' : ''}>${x.live}</option></select></label></div>
      </div>
      <div class="card"><h2>${x.bank}</h2><div class="cols">
        ${field('bank_owner', x.bankOwner)}${field('bank_iban', x.iban, 'dir="ltr" placeholder="DE00 0000 0000 0000 0000 00"')}${field('bank_bic', x.bic, 'dir="ltr"')}${field('bank_name', x.bankName)}${field('bank_days', x.bankDays, 'type="number" min="1" max="30" dir="ltr"')}
      </div></div>
      <div class="card"><h2>${x.ship}</h2><div class="cols">
        ${money('shipping_fee', x.shipFee)}${money('free_shipping_over', x.freeOver)}${field('delivery_days', x.deliveryDays, 'dir="ltr" placeholder="2-4"')}
      </div>${sw('free_shipping_all', x.freeAll, s.free_shipping_all === '1')}
        <label>${x.tiers}<textarea name="shipping_tiers" rows="3" dir="ltr" placeholder="DE: 2=5,19; 5=7,69">${esc(s.shipping_tiers || '')}</textarea><small class="muted">${x.tiersHint}</small></label>
        <label>${x.rates}<textarea name="rates_text" rows="4" dir="ltr">${esc(rates)}</textarea></label>
      </div>
      <div class="card"><h2>${x.vatTitle}</h2><div class="cols">
        <label>${x.vatMode}<select name="vat_mode"><option value="small"${s.vat_mode !== 'included' ? ' selected' : ''}>${x.vatSmall}</option><option value="included"${s.vat_mode === 'included' ? ' selected' : ''}>${x.vatIncl}</option></select></label>
        ${field('vat_rate', x.vatRate, 'type="number" min="0" max="30" dir="ltr"')}
      </div></div>
      <div class="card"><h2>${x.legalDe}</h2><div class="cols">
        ${field('legal_company', x.legalCompany)}${field('legal_name', x.legalOwner)}${field('legal_vat_id', x.legalVat, 'dir="ltr"')}${field('legal_wid', x.legalWid || 'W-IdNr.', 'dir="ltr"')}${field('legal_register', x.legalRegister)}
      </div>${field('legal_address', x.legalAddress)}
        <p class="muted small">${['impressum', 'agb', 'widerruf', 'datenschutz', 'versand'].map((k) => `<a href="/de/${k}" target="_blank" rel="noopener">/de/${k}</a>`).join(' · ')}</p>
        <p class="actions"><a class="btn ghost" href="/api/admin/subscribers.csv">${icon('download', 18)}<span>${x.exportSubs}</span></a></p>
      </div>
      <div class="card" id="emails"><div class="card-head"><h2>${icon('mail')} ${L.emails}</h2><span class="chip ${state.emails ? 'chip-ok' : 'chip-warn'}">${state.emails ? L.keyOk : L.keyMissing}</span></div>
        <p class="muted small">${L.emailsIntro}</p>
        ${state.emails ? '' : steps}
        <div class="cols">
          ${field('email_from', L.emailFrom, 'type="email" dir="ltr" placeholder="boutique@gmail.com"')}
          ${field('notify_email', L.notifyEmail, 'type="email" dir="ltr" placeholder="you@gmail.com"')}
        </div>
        <label class="switch"><input type="checkbox" name="email_status_updates"${s.email_status_updates !== '0' ? ' checked' : ''}><span></span> ${L.statusUpdates}</label>
        <div class="actions"><button type="button" class="btn ghost" data-test>${icon('mail', 18)}<span>${L.sendTest}</span></button></div>
        ${state.emails ? `<details><summary class="muted small">${L.howItWorks}</summary>${steps}</details>` : ''}
      </div>
      <div class="card"><h2>${L.social}</h2><p class="muted small">${L.socialHint}</p><div class="cols">
        ${field('instagram', 'Instagram', 'dir="ltr" placeholder="https://instagram.com/…"')}
        ${field('facebook', 'Facebook', 'dir="ltr" placeholder="https://facebook.com/…"')}
        ${field('tiktok', 'TikTok', 'dir="ltr" placeholder="@…"')}
      </div></div>
      <div class="card"><h2>${L.seo}</h2><p class="muted small">${L.seoHint}</p>
        ${field('google_verify', L.googleVerify, 'dir="ltr" placeholder="&lt;meta name=&quot;google-site-verification&quot; content=&quot;…&quot;&gt;"')}<p class="muted small">${L.googleHow}</p>
      </div>
      <div class="card"><h2>${L.security}</h2><p class="muted small">${L.securityHint}</p>
        ${field('turnstile_site_key', L.turnstileKey, 'dir="ltr" pattern="[0-9A-Za-z_-]{10,80}" placeholder="0x4AAAAAAA…"')}
        <p class="small ${state.turnstile ? 'ok-text' : 'muted'}">${state.turnstile ? L.turnstileOn : L.turnstileHow}</p>
      </div>
      <div class="card"><h2>${L.pixels}</h2><p class="muted small">${L.pixelsHint}</p><div class="cols">
        <div>${field('meta_pixel_id', L.metaPixel, 'dir="ltr" inputmode="numeric" pattern="[0-9]{8,20}" placeholder="123456789012345"')}<p class="muted small">${L.metaHow}</p></div>
        <div>${field('tiktok_pixel_id', L.tiktokPixel, 'dir="ltr" pattern="[A-Za-z0-9]{10,30}" placeholder="C4ABCDEFGHIJ1234567"')}<p class="muted small">${L.tiktokHow}</p></div>
      </div></div>
      <div class="card"><h2>${L.banner}</h2><p class="muted small">${L.bannerHint}</p>
        ${contentLangs().map((l) => field(`announcement_${l}`, LANG_LABEL[l], dirOf(l))).join('')}
      </div>
      <div class="card"><h2>${L.homePage}</h2><p class="muted small">${L.homeHint}</p><div class="cols">
        ${contentLangs().map((l) => field(`hero_title_${l}`, `${L.heroTitle} · ${LANG_LABEL[l]}`, dirOf(l)) + field(`hero_text_${l}`, `${L.heroText} · ${LANG_LABEL[l]}`, dirOf(l))).join('')}
      </div></div>
      <div class="sticky-actions"><button class="btn">${L.saveSettings}</button></div>
    </form>`,
    );
    const f = document.getElementById('sform');
    const save = async () => {
      const data = Object.fromEntries(new FormData(f));
      data.whatsapp = data.whatsapp.replace(/\D/g, '').replace(/^00/, '').replace(/^0(?=1)/, '49');
      data.email_status_updates = f.email_status_updates.checked ? '1' : '0';
      for (const k of ['pay_paypal', 'pay_bank', 'pay_cod']) data[k] = f[k].checked ? '1' : '0';
      data.free_shipping_all = f.free_shipping_all.checked ? '1' : '0';
      for (const k of ['cod_fee', 'shipping_fee', 'free_shipping_over']) data[k] = String(Math.round(eur(data[k]) * 100));
      const rates = {};
      for (const line of String(data.rates_text || '').split('\n')) {
        const m = line.trim().match(/^([A-Za-z]{2})\s*[=:]\s*([\d.,]+)$/);
        if (m) rates[m[1].toUpperCase()] = Math.round(eur(m[2]) * 100);
      }
      delete data.rates_text;
      data.shipping_rates = JSON.stringify(rates);
      data.meta_pixel_id = data.meta_pixel_id.trim();
      data.turnstile_site_key = data.turnstile_site_key.trim();
      data.tiktok_pixel_id = data.tiktok_pixel_id.trim().toUpperCase();
      await api('/settings', { method: 'PUT', body: data });
      state.settings = (await api('/settings')).settings;
    };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await save();
        toast(L.settingsSaved);
        settings();
      } catch (err) {
        toast(err.message, true);
      }
    });
    f.querySelector('[data-test]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await save();
        const r = await api('/test-email', { method: 'POST', body: {} });
        toast(L.testSent(r.to));
      } catch (err) {
        toast(err.message, true);
      }
      btn.disabled = false;
    });
  }

  start();
})();
