var Engine = function(canvas) {
	var engine = {}
	engine.gfx = GraphicsEngine(engine, canvas);
	engine.resources = ResourceManager(engine);
	engine.world = WorldEngine(engine);
	engine.input = InputController(engine);
	return engine;
}