JSON.forgivingParse = function(data) {
	var dataTokens = data.split("\"");
	var insideString = false;
	for (var i in dataTokens) {
		if (insideString) {
			// escape control characters
			dataTokens[i] = dataTokens[i].replace(/[\t]/g, "\\t");
			dataTokens[i] = dataTokens[i].replace(/[\r]+/g, "\\r");
			dataTokens[i] = dataTokens[i].replace(/[\n]+/g, "\\n");
		} else {
			// strip comments
			dataTokens[i] = dataTokens[i].replace(/\*.*?\*/g, "");
			dataTokens[i] = dataTokens[i].replace(/\/\/.*?(\n|\r|\r\n)/g, "");
			
			// strip additional commas
			dataTokens[i] = dataTokens[i].replace(/,\s*\]/g, "]");
			dataTokens[i] = dataTokens[i].replace(/,\s*\}/g, "}");
		}
		insideString = !insideString
		if (!insideString && dataTokens[i][dataTokens[i].length - 1] == "\\") {
			insideString = true;
		}
	}
	return JSON.parse(dataTokens.join("\""));
}