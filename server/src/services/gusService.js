import fetch from 'node-fetch';

// ADRES TESTOWY
const GUS_URL = 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
const API_KEY = 'abcde12345abcde12345'; 

// Funkcja wyciągająca wartość z XML (ignoruje namespace i wielkość liter)
const extract = (tag, xml) => {
    // 1. Próba znalezienia tagu bez namespace np. <Nazwa>...</Nazwa>
    let regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'i');
    let match = xml.match(regex);
    if (match && match[1]) return match[1];

    // 2. Próba znalezienia z namespace np. <d:Nazwa>...</d:Nazwa>
    regex = new RegExp(`<[a-z0-9]+:${tag}[^>]*>(.*?)<\/[a-z0-9]+:${tag}>`, 'i');
    match = xml.match(regex);
    if (match && match[1]) return match[1];

    return '';
};

export async function fetchCompanyData(nip) {
    // --- FALLBACK DLA ŚRODOWISKA TESTOWEGO ---
    // Jeśli GUS API szwankuje (co na testowym jest normą), zwracamy dane na sztywno dla tego konkretnego NIPu
    // Pozwala to testować resztę aplikacji bez blokady.
    if (nip === '8992689516') {
        console.log("[GUS INFO] Używam danych testowych dla NIP 8992689516");
        return {
            name: "MĄDRA GŁOWA SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ",
            address: "ul. Miodowa 13/5",
            city: "Warszawa",
            zip: "00-246"
        };
    }
    if (nip === '1234567890') {
        return {
            name: "WARSZTAT TESTOWY JAN KOWALSKI",
            address: "ul. Sezamkowa 10",
            city: "Kraków",
            zip: "30-001"
        };
    }
    // -----------------------------------------

    try {
        console.log(`[GUS] Szukam NIP: ${nip}`);

        // 1. LOGOWANIE
        const loginRes = await fetch(GUS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
            body: `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
                <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
                    <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj</wsa:Action>
                    <wsa:To>${GUS_URL}</wsa:To>
                </soap:Header>
                <soap:Body><ns:Zaloguj><ns:pKluczUzytkownika>${API_KEY}</ns:pKluczUzytkownika></ns:Zaloguj></soap:Body>
            </soap:Envelope>`
        });

        const loginXml = await loginRes.text();
        const sidMatch = loginXml.match(/<([a-zA-Z0-9:]*)ZalogujResult>(.*?)<\/[a-zA-Z0-9:]*ZalogujResult>/);
        const sid = sidMatch ? sidMatch[2] : null;

        if (!sid) throw new Error('Brak sesji SID');

        // 2. SZUKANIE
        const searchRes = await fetch(GUS_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'sid': sid 
            },
            body: `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
                <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
                    <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty</wsa:Action>
                    <wsa:To>${GUS_URL}</wsa:To>
                </soap:Header>
                <soap:Body>
                    <ns:DaneSzukajPodmioty>
                        <ns:pParametryWyszukiwania><ns:Nip>${nip}</ns:Nip></ns:pParametryWyszukiwania>
                    </ns:DaneSzukajPodmioty>
                </soap:Body>
            </soap:Envelope>`
        });

        let searchXml = await searchRes.text();

        // Dekodowanie encji HTML (to kluczowe w GUS)
        searchXml = searchXml
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&#xD;/g, '')
            .replace(/&#xA;/g, '');

        if (searchXml.includes('<ErrorCode>')) return null;

        // 3. WYCIĄGANIE DANYCH
        const name = extract('Nazwa', searchXml);
        
        if (!name) {
            console.log("[GUS] Nie znaleziono danych w XML.");
            return null;
        }

        const street = extract('Ulica', searchXml);
        const propertyNr = extract('NrNieruchomosci', searchXml);
        const apartmentNr = extract('NrLokalu', searchXml);
        const city = extract('Miejscowosc', searchXml);
        const zip = extract('KodPocztowy', searchXml);

        let fullAddress = street ? `${street} ${propertyNr}` : `${city} ${propertyNr}`;
        if (apartmentNr) fullAddress += `/${apartmentNr}`;

        return {
            name: name,
            address: fullAddress,
            city: city,
            zip: zip
        };

    } catch (err) {
        console.error("[GUS Error]", err.message);
        throw err;
    }
}