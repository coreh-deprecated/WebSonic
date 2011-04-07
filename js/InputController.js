var InputController = function(engine){
	var input = {};
	var keysHeld = {};
	var keysPressed = {};
	$(window).keydown(function(e){
		if (!e.ctrlKey && !e.metaKey) {
			// For keysPressed, we need to check if the key was already held,
			// because chrome sends keyDown events of auto-repeated keys
			if (keysHeld[e.which] != true) {
				keysPressed[e.which] = true; 
			}
			keysHeld[e.which] = true;
			e.preventDefault();
			e.stopPropagation();
		}
	});
	$(window).keyup(function(e){
		keysHeld[e.which] = false;
		if (!e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			e.stopPropagation();
		}
	});
	$(window).keypress(function(e){
		if (!e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			e.stopPropagation();
		}
	});
	
	input.pressedUp = function() { return input.pressed(38); }
	input.pressedDown = function() { return input.pressed(40); }
	input.pressedLeft = function() { return input.pressed(37); }
	input.pressedRight = function() { return input.pressed(39); }
	
	input.pressed = function(keycode) {
		return keysPressed[keycode] == true;
	}
	
	input.held = function(keycode) {
		return keysHeld[keycode] == true;			
	}
	
	input.heldUp = function() { return input.held(38); }
	input.heldDown = function() { return input.held(40); }
	input.heldLeft = function() { return input.held(37); }
	input.heldRight = function() { return input.held(39); }
	
	input.resetPressed = function() {
		keysPressed = {};
	}
	return input;
}