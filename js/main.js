		window.onload = function(){
			var canvas = $("#c")[0];
			var engine = Engine(canvas);
			
/*			var pitch = 0.0;
			var yaw = 0.0;
			var holding = false;
			var oldX, oldY, oldPitch, oldYaw;
			var alpha = 0.0;
			window.addEventListener("mouseup", function(e){
				holding = false;
			}, false);
			window.addEventListener("mousedown", function(e){
				oldX = e.clientX;
				oldY = e.clientY;
				oldYaw = yaw;
				oldPitch = pitch;
				holding = true;
				e.preventDefault();
				e.stopPropagation();
			}, false);			
			window.addEventListener("mousemove", function(e){
				if (holding) {
					pitch = oldPitch + (e.clientY - oldY) * 0.01;
					yaw = oldYaw + (e.clientX - oldX) * 0.01;
				}
			}, false);*/
			engine.resources.load("mesh/monitor.jsonmesh");		
			engine.resources.load("mesh/spinball.jsonmesh")
			engine.resources.load("mesh/sonic.jsonmesh");	
			engine.resources.load("mesh/spring.jsonmesh");		
			engine.resources.load("mesh/ring.jsonmesh");		
			engine.resources.load("level/lvl0.jsonlevel");
			engine.resources.load("shader/depth.jsonshader");
			engine.resources.load("shader/glow.jsonshader");
			var interval = setInterval(
				function () {
//					try {
						if (engine.resources.totalPending() == 0) {		
							var camera = engine.world.Camera();
							camera.rotation(Matrix.RotationX(-1/4*Math.PI).ensure4x4());
							engine.world.add(camera);
							camera.position($V([128,512,512]));
							var level = engine.world.LevelEntity(engine.resources.get("level/lvl0.jsonlevel"));
							engine.world.add(level);				
						/*	for (var c = 0; c<32; c++) {
								var ring = Ring(engine, player, level);
								ring.position($V([1536/2, 64, 64]));
//								mesh.scale($V([0.3,0.3,0.3]));
								engine.world.add(ring);
							}*/
						
						

							
							var player = Player(engine, camera, level);	
							player.position($V([1536/2,128/2,128/2]));
							engine.world.add(player);
							engine.world.add(new Spring(engine, player));
							
							clearInterval(interval);
							var alpha = 0.0;
							interval = setInterval( function () {	
								alpha += 0.1;
								if ($(window).width() != canvas.width || $(window).height() != canvas.height) {
									canvas.width = $(window).width();
									canvas.height = $(window).height();
									engine.gfx.gl.viewport(0,0,canvas.width, canvas.height);
								}

	/*							//alpha+= 0.1;
	//							for (var c = 0; c < 10; c++) {
									//engine.resources.get("mesh/lvl0.jsonmesh").render(Matrix.Perspective(45, canvas.width/canvas.height, 1, 1000), Matrix.Translation($V([0,0,-50])).x(Matrix.RotationY(yaw+alpha *0.1).ensure4x4()).x(Matrix.RotationX(pitch).ensure4x4()).x(Matrix.Translation($V([0,-10,0]))).x($V([256.0,256.0,256.0,1.0]).toDiagonalMatrix()), 0, [{ u_lightColor: $V([1.0,1.0,1.0,1.0]), u_lightDirection: $V([Math.sin(alpha* 0.01), Math.cos(alpha * 0.01), 0]) }, {u_ambientLightColor: $V([0.0,0.2,0.1,1.0])}]);
									engine.resources.get("level/lvl0.jsonlevel").render(Matrix.Perspective(45, canvas.width/canvas.height, 1, 10000).x(Matrix.RotationX(pitch).ensure4x4()).x(Matrix.RotationY(yaw).ensure4x4()).x(Matrix.Translation($V([-128,-128,-128]))), [{ u_lightColor: $V([1.0,1.0,1.0,1.0]), u_lightDirection: $V([Math.sin(alpha* 0.1), Math.cos(alpha * 0.1), 0]) }, {u_ambientLightColor: $V([0.0,0.2,0.1,1.0])}]);
	//							}*/
								//camera.position($V([0, 0, -10]));
								
								try {
									alpha += 0.001;
								//camera.rotation(Matrix.RotationX(0.0).ensure4x4().x(Matrix.RotationY(0.1).ensure4x4()).x(camera.rotation()))
								engine.world.update();
								engine.world.render();
								var seconds = engine.world.time();
								$("#time")[0].innerHTML = Math.floor(seconds / 60) + ":" + ((Math.floor(seconds) % 60 < 10)?"0":"") +  Math.floor(seconds) % 60;
								} catch(e) {
									console.error(e.message + e.stack);
									clearInterval(interval);
								} 
							}, 1000.0/60.0 );
						}					
			/*		} catch (e) {
						console.error(e.message);
						clearInterval(interval);
					}*/
				}, 1000/60.0);
		}