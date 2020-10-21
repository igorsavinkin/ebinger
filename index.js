const Apify = require('apify');

// Apify.utils contains various utilities, e.g. for logging.
// Here we use debug level of logging to improve the debugging experience.
// This functionality is optional!
const { log } = Apify.utils;
log.setLevel(log.LEVELS.DEBUG);

const queue_name ='ebinger';
const base_url = 'https://www.ebinger-gmbh.com/';
//var navigations =[];
var product_counter = 0;

// Apify.main() function wraps the crawler logic (it is optional).
Apify.main(async () => {
    // Create an instance of the RequestList class that contains a list of URLs to crawl.
    // Add URLs to a RequestList
	const requestQueue = await Apify.openRequestQueue(queue_name);
	const lineReader = require('line-reader');
	lineReader.eachLine('categories.txt', async function(line) {
		//console.log('adding ', line);
		let url = base_url + line.trim(); 
		await requestQueue.addRequest({ url: url });
	}); 
	var { totalRequestCount, handledRequestCount, pendingRequestCount, name } = await requestQueue.getInfo();
	console.log(`RequestQueue "${name}" with requests:` );
	console.log(' handledRequestCount:', handledRequestCount);
	console.log(' pendingRequestCount:', pendingRequestCount);
	console.log(' totalRequestCount:'  , totalRequestCount);	
	//process.exit(); 
	
    // Create an instance of the CheerioCrawler class - a crawler
    // that automatically loads the URLs and parses their HTML using the cheerio library.
    const crawler = new Apify.CheerioCrawler({
        // Let the crawler fetch URLs from our list.
        requestQueue,

        // The crawler downloads and processes the web pages in parallel, with a concurrency
        // automatically managed based on the available system memory and CPU (see AutoscaledPool class).
        // Here we define some hard limits for the concurrency.
        minConcurrency: 10,
        maxConcurrency: 50,

        // On error, retry each page at most once.
        maxRequestRetries: 1,

        // Increase the timeout for processing of each page.
        handlePageTimeoutSecs: 30,

        // Limit to 10 requests per one crawl
        maxRequestsPerCrawl: 100000,

        // This function will be called for each URL to crawl.
        // It accepts a single parameter, which is an object with options as:
        // https://sdk.apify.com/docs/typedefs/cheerio-crawler-options#handlepagefunction
        // We use for demonstration only 2 of them:
        // - request: an instance of the Request class with information such as URL and HTTP method
        // - $: the cheerio object containing parsed HTML
        handlePageFunction: async ({ request, $ }) => {
            log.debug(`Processing ${request.url}...`);

			// detail page or category page ?
			if (request.url.includes("/id-") ){
				// detail page process
				
				
				
				// Store the results to the default dataset. In local configuration,
				// the data will be stored as JSON files in ./apify_storage/datasets/default
				await Apify.pushData({
					url: request.url
					//, title
				});
			} else {
				// category page				
				
				// add navigation links into requestQueue
				$('.link').each((index, el) => { 
					requestQueue.addRequest({ url: base_url + $(el).attr('href').trim() }); 				
					console.log('added into requestQueue ', $(el).attr('href'));
				});
				var product=[];
				// get product pages
				$('h2 a').each((index, el) => {
					requestQueue.addRequest({ url: base_url + $(el).attr('href').trim() });
					product_counter+=1;		 
				});
				
				//console.log('category url:', request.url);
				log.info("Total products: " , product_counter );
				//process.exit();
			}
            // Extract data from the page using cheerio.
            /*const title = $('title').text();
            const h1texts = [];
            $('h1').each((index, el) => {
                h1texts.push({
                    text: $(el).text(),
                });
            });*/
			

            
        },

        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            log.debug(`Request ${request.url} failed twice.`);
        },
    });

    // Run the crawler and wait for it to finish.
    await crawler.run();

    log.debug('Crawler finished.');
	//console.log('navigations:');
	//console.log(navigations);
});