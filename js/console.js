//if (!window.console) {
	window.console = {};
	window.console.initialTime = (new Date()).getTime();
	window.console.log = function(message){
		//return;
		var div = document.createElement("div");
		div.innerHTML = " [ " + (((new Date()).getTime() - window.console.initialTime) / 1000).toFixed(4) + "s ] " +  message;
		$("#log")[0].appendChild(div);
		$("#console").attr({ scrollTop: $("#console").attr("scrollHeight") }, 3000);
		setTimeout(function(){
			$(div).fadeOut(1000,function(){
				div.parentNode.removeChild(div);
			});
		}, 2000);
	}
	window.console.warn = function(message){
		var div = document.createElement("div");			
		div.innerHTML = " [ " + (((new Date()).getTime() - window.console.initialTime) / 1000).toFixed(4) + "s ] <strong>Warning:</strong> " + message;		
		div.className = "warning";
		$("#log")[0].appendChild(div);
		$("#console").attr({ scrollTop: $("#console").attr("scrollHeight") }, 3000);
		setTimeout(function(){
			$(div).fadeOut(1000,function(){
				div.parentNode.removeChild(div);
			});
		}, 2000);			
	}
	window.console.error = function(message){
		var div = document.createElement("div");
		div.innerHTML = "<strong>Error:</strong> " + message;
		div.className = "error";
		$("#log")[0].appendChild(div);
		$("#console").attr({ scrollTop: $("#console").attr("scrollHeight") }, 3000);
	}
	window.console.info = function(message){
		var div = document.createElement("div");
		div.innerHTML = message;
		div.className = "info";
		$("#info")[0].appendChild(div);
		$("#console").attr({ scrollTop: $("#console").attr("scrollHeight") }, 3000);
		setTimeout(function(){
			$(div).fadeOut(2000,function(){
				div.parentNode.removeChild(div);
			});
		}, 10000);			
	}		
//}