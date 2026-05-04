const puppeteer = require('puppeteer');
const fs = require('fs');

async function getDividend(page, ticker) {
    await page.goto(`https://statusinvest.com.br/fundos-imobiliarios/${ticker.toLowerCase()}`, {
        waitUntil: 'domcontentloaded'
    });

    await new Promise(r => setTimeout(r, 5000));

    await page.evaluate(() => {
        document.querySelector('#earning-section')?.scrollIntoView();
    });

    await new Promise(r => setTimeout(r, 3000));

    const exists = await page.$('#earning-section');
    console.log(`${ticker} - earning section exists?`, !!exists);

    const baseSelector = '#earning-section table tbody tr:first-child';

    const date = await page.$eval(
        `${baseSelector} td:nth-child(3)`,
        el => el.innerText.trim()
    );

    const value = await page.$eval(
        `${baseSelector} td:nth-child(4)`,
        el => el.innerText.trim()
    );

    const numeric = parseFloat(value.replace(',', '.'));

    return {
        ticker,
        date,
        dividend: value,
        dividendNumeric: numeric
    };
}

// helper to safely format CSV values
function safe(value) {
    return `"${String(value)
        .replace(/"/g, '""')
        .replace(/\s+/g, ' ')
        .trim()}"`;
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    const tickers = [
        'AFHI11',
        'ALZR11',
        'BTLG11',
        'CPSH11',
        'FLMA11',
        'IRIM11',
        'KNSC11',
        'RZTR11',
        'TRXF11',
        'VGIR11',
        'VISC11',
        'XPML11'
    ];

    const results = [];

    for (const ticker of tickers) {
        try {
            const result = await getDividend(page, ticker);

            console.log(`${result.ticker}: ${result.dividend} (paid on ${result.date})`);

            results.push(result);
        } catch (err) {
            console.log(`${ticker}: ERROR`);
            results.push({ ticker, date: '', dividend: '' });
        }
    }

    // CSV with proper formatting (Excel-friendly)
    const header = 'ticker;date;dividend\r\n';

    const rows = results
        .map(r => `${safe(r.ticker)};${safe(r.date)};${safe(r.dividend)}`)
        .join('\r\n');

    fs.writeFileSync('result.csv', header + rows, 'utf8');

    console.log('\nCSV file created: result.csv');

    await browser.close();
})();