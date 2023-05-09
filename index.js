const readlineSync = require('readline-sync')
const puppeteer = require('puppeteer')
const cheerio = require('cheerio')
const os = require('os')
const fs = require('fs')

// const getChromiumExecutablePath = () => {
//     const platform = os.platform();
//     console.log(platform)
//     if (platform === 'win32') {
//       return 'chrome-win/chrome.exe';
//     } else if (platform === 'darwin') {
//       return 'chrome-mac/Chromium.app/Contents/MacOS/Chromium';
//     }
//     throw new Error('Unsupported platform: ' + platform);
// };
function removeAfterComma(str) {
    const commaIndex = str.indexOf(',');
    if (commaIndex === -1) {
      return str; // no comma found, return original string
    }
    return str.slice(0, commaIndex);
  }

const appendUrlToFile = (url, filename = 'visitedaccounts.txt') => {
    try {
        if (!fs.existsSync(filename)) {
            fs.writeFileSync(filename, '');
        }

        fs.appendFileSync(filename, url + '\n');
    } catch (err) {
        console.error('Error appending URL to file:', err);
    }
};


const readFileAsArray = (filename = 'visitedaccounts.txt') => {
    try {
      const data = fs.readFileSync(filename, 'utf-8');
      const urlArray = data.trim().split('\n');
      return urlArray;
    } catch (err) {
      console.error('Error reading file:', err);
      return null;
    }
  };

const scroll = async (page) => {
    await page.waitForSelector('button.t-12.button--unstyled');

    // Click the button
    await page.click('button.t-12.button--unstyled');
    await page.mouse.move(900, 900)
    
     // Scroll down the page using the "Page Down" key
    for (let i = 0; i < 20; i++) { // Change the number 10 to the desired number of times you want to press "Page Down"
       
        await page.keyboard.press("PageDown");
        await page.waitForTimeout(1000); // Adjust the delay as needed to give the
    }
}
const linkedin = async () => {
    const visitedAccounts = readFileAsArray();
    let browser
    try {
        const puppeteer = require('puppeteer');

        browser = await puppeteer.launch({
            // executablePath: getChromiumExecutablePath(),
            // headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
            // other options...
        });

   
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(0);
        await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36")

        await page.goto('https://www.linkedin.com/uas/login?session_redirect=/sales&fromSignIn=true&trk=navigator')
        // readlineSync.question('What is your email?')
        const email = readlineSync.question('What is your email?')
        const password = readlineSync.question('What is your password?', { hideEchoBack: true })
        // await page.

        // Wait for the email input field and type the email address
        
        await page.click('#username');
        await page.waitForSelector('#username', { timeout: 10000 });
        
        await page.type('#username', email);

        // Wait for the password input field and type the password
        await page.waitForSelector('#password', { timeout: 10000 });
        await page.type('#password', password);
    
        // Click the login button
        await page.click('button[type="submit"]');    
        // Grab the cookies from the page used to log in
        await page.waitForTimeout(5000)

        await page.goto('https://www.linkedin.com/sales/search/saved-searches/people')
        await page.waitForTimeout(5000)
        const html = await page.content()
        const $ = cheerio.load(html)
        let links = []
        $('a').each((i, el) => {
            const item = $(el).attr('href')
            if(item.includes('savedSearchId')) {
                links.push(item)
            }
        })

                // ...
        for (const link of links) {
            await page.goto(`https://www.linkedin.com${link}`);

            console.log(link);
            let page_num = 1;
            while (true) {

                console.log('page: ', page_num)
                await page.waitForSelector('a[data-control-name="view_lead_panel_via_search_lead_name"]');
                await scroll(page);
                
                let elements = await page.$$('a[data-control-name="view_lead_panel_via_search_lead_name"]');

                
                const page2 = await browser.newPage();
                const hrefs = [];
                if (elements.length === 0) {
                    console.log('timeout')
                    await page.timeout(30000) // 5 minutes 300000 milliseconds
                    await page.goto(`https://www.linkedin.com${link}`);
                    await page.waitForSelector('a[data-control-name="view_lead_panel_via_search_lead_name"]');
                    await scroll(page);
                    elements = await page.$$('a[data-control-name="view_lead_panel_via_search_lead_name"]');
                }

                // Loop through the elements and click each one
                for (const element of elements) {
                    const href = await page.evaluate((el) => el.getAttribute('href'), element);
                    hrefs.push(href);
                }

                for (const account of hrefs) {
                    if (!visitedAccounts.includes(removeAfterComma(account))) {
                        await page2.goto(`https://www.linkedin.com${account}`);
                        // Add a delay if needed, to give the page time to process each click and load new content
                        await page2.waitForTimeout(3000);
                        console.log('clicking');
                        appendUrlToFile(removeAfterComma(account));
                    } else {
                        console.log("Already viewed")
                    }
                }
                page2.close();

                const nextButton = await page.$('[aria-label="Next"]');
                if (nextButton) {
                    // Click the element if it exists
                    await nextButton.click();

                    // Add a delay if needed, to give the page time to process the click and load new content
                    await page.waitForTimeout(1000);
                    page_num++;
                } else {
                    // Break the loop if the element doesn't exist

                    console.log('done search');
                    break;
                }
            }
        }
        // ...


    }
    catch (err) {
        console.log(err)
    }
    finally {
        console.log('and you are done')
        console.log('Made by Alexander Swan (alexander.swan12@gmail.com)')
        browser.close()
    }
}

const main = async () => {
    await linkedin()
      
}

main()
