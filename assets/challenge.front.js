const ip = "1.1.1.1"
const challenge = "a33a38b9235d5b27a606234d60a44deb"
const difficulty = 4
const publicSalt = "CHANGE_ME"
const indexing = document.getElementsByClassName("indexing")[0]
const indexRes = document.getElementById("index_res")
const bruteforcing = document.getElementsByClassName("bruteforcing")[0]
const bruteRes = document.getElementById("brute_res")
const solvedRes = document.getElementsByClassName("solved")[0]
let startDate = undefined

let indexScript = `

	let possibleStrings = []

	function iterateStrings(currentString, length) {
		const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

		if (currentString.length === length) {
			possibleStrings.push(currentString)
			return;
		}

		for (let i = 0; i < alphabet.length; i++) {
			iterateStrings(currentString + alphabet[i], length);
		}
	}

	self.onmessage = function(e) {
		iterateStrings("", e.data.difficulty)
		self.postMessage(possibleStrings)
		self.close()
	}


`

let workerScript = `

	importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js');

    self.onmessage = function(e) { 
	
		function compareObj(obj1, obj2, iteration){
			if(iteration > 4){
				return true
		  	}
			for(let key in obj1){
				if(typeof obj1[key] == "function"){
					return true
				}
			  	if(typeof obj1[key] == "object"){
					compareObj(obj1[key], obj2[key], iteration + 1)
				} else {
					if(obj1[key] != obj2[key]){
						return false
			  		}
				}
			}
		  	return true
		}

		resp = {
			match: compareObj(navigator, e.data.navigator, 0),
			solution: "",
			access: ""
		}

		e.data.arr.forEach(string => {
			if(CryptoJS.MD5(e.data.ip+e.data.publicSalt+string) == e.data.challenge){
				resp.solution = string
				resp.access = CryptoJS.MD5(string+e.data.ip).toString()
				self.postMessage(resp)
				self.close()
			}
		})

		console.log("Worker Couldn't Find Hash")
		self.close()
    }
`

let possibleStrings = []

function spawnIndexWorker(arr) {
	console.log("Spawned Index-Worker")
	let blob = new Blob([indexScript], {
		type: 'text/javascript'
	});

	// Convert the Blob to a URL using URL.createObjectURL()
	var url = URL.createObjectURL(blob);

	// Create a new Worker using the Blob URL
	var worker = new Worker(url);

	// Listen for messages from the worker
	worker.onmessage = indexed
	let workerMsg = {
		difficulty
	}

	// Give the worker his array of strings to bruteforce
	worker.postMessage(workerMsg);
}

function spawnWorker(arr) {
	console.log("Spawned Worker")
	let blob = new Blob([workerScript], {
		type: 'text/javascript'
	});

	// Convert the Blob to a URL using URL.createObjectURL()
	var url = URL.createObjectURL(blob);

	// Create a new Worker using the Blob URL
	var worker = new Worker(url);

	// Listen for messages from the worker
	worker.onmessage = solved
	let workerMsg = {
		challenge: challenge,
		navigator: navigatorData,
		ip: ip,
		publicSalt: publicSalt,
		arr: arr
	}

	// Give the worker his array of strings to bruteforce
	worker.postMessage(workerMsg);
}

function divideArray(arr, parts) {
	let result = [];
	let len = arr.length;
	let partLen = Math.floor(len / parts);

	for (let i = 0; i < parts; i++) {
		let start = partLen * i;
		let end = i === parts - 1 ? len : start + partLen;

		result.push(arr.slice(start, end));
	}

	return result;
}

// A worker bruteforced it
function solved(res) {
	if (res.data.match) {
		let endDate = new Date
		console.log("🥳 Heureka", res.data)
		console.log("Solved In:", (endDate.getTime() - startDate.getTime())/1000)
		bruteRes.children[0].innerHTML = "V"
		bruteRes.classList.remove('blink')
		bruteRes.children[1].remove()
		bruteRes.children[1].remove()
		solvedRes.style.visibility = "visible"
		document.cookie = "POW-Solution=" + res.data.access + "; SameSite=Lax; path=/; Secure";
		window.location.reload()
	} else {
		console.log("🕵️ Something's wrong")
	}
}

function cloneObject(obj, iteration) {
	var clone = {};
	if (iteration > 4) {
		return clone
	}
	for (var i in obj) {
		if (typeof obj[i] == "object" && obj[i] != null && !(obj[i] instanceof Function))
			clone[i] = cloneObject(obj[i], iteration + 1);
		else if (typeof obj[i] !== 'function' && !(obj[i] instanceof HTMLElement))
			clone[i] = obj[i];
	}
	return clone;
}

function indexed(res){

	possibleStrings = res.data
	console.log("🥱 Indexed Strings")
	indexRes.children[0].innerHTML = "V"
	indexRes.classList.remove('blink')
	indexRes.children[1].remove()
	indexRes.children[1].remove()
	bruteforcing.style.visibility = "visible"

	// Clone navigator
	navigatorData = cloneObject(navigator, 0);

	// Calculate how many workers we can create
	let numWorkers = navigator.hardwareConcurrency
	if (numWorkers == undefined) {
		numWorkers = 2
	}
	if (numWorkers > 8) {
		numWorkers = 8
	}

	let arrs = divideArray(possibleStrings, numWorkers)

	console.log("💪 Bruteforcing")
	startDate = new Date

	arrs.forEach(arr => {
		spawnWorker(arr)
	})
}

indexing.style.visibility = "visible"

spawnIndexWorker()