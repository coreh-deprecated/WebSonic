WebSonic Engine - WebGL Sonic the Hedgehog Game Engine
======================================================

This is a Sonic engine I showcased on Sonic Retro last year. (2010)

It's written on JavaScript, and makes use of the WebGL canvas API of HTML5 to
draw its graphics.

To play it, you'll need a modern browser with WebGL support (Firefox 4.0 and
Chrome 10.0 are good enough) and a semi-decent graphics card. Just fire up
`index.html` and you're ready to go.

Keep in mind that to run it locally in Chrome, without a Web server, you'll
need to launch the browser with the `--allow-file-access-from-files` command 
line flag.

Introduction
------------

I was planning on a bigger release for this project, with finished levels and
gameplay, but couldn't get it done due to time constraints. This perfectly
usable piece of code had been sitting on my hard drive for months untouched, 
which is totally unfair, so I figured it was a good idea to release it for 
other people to tinker with it.

This Engine is a more or less accurate implementation of the algorithms on the
[Sonic Physics Guide](http://info.sonicretro.org/Sonic_Physics_Guide),
generalized to ℝ³. Some subtle adaptions had to be made, since the original 
Sonic engine used height maps for collisions, (I couldn't afford to do that
here) used a strange fixed point encoding for numbers, (I couldn't bother to
use something other than JS's `Number`) and had like, only two dimensions to
worry about.

My goal here was to make it "feel" almost exactly as the original Sonic games,
if you only walked left and right and hit jump. I think I've accomplished that
goal.

**Beware:** The engine code is really messy, hacky and poorly documented. 
Sorry, I didn't have enough free time to refactor/clean it up. You might also
find code doing something stupid as far as WebGL is concerned, since I wrote
this engine as a learning exercise for WebGL.

Controls
--------

    [Q][W]  - Rotate Camera             
        [S]  - Look Up
         [X] - Jump                               [^]
           [    Spacebar - Crouch Down    ]    [<][V][>] - Move
          
                    Spindash = Crouch Dowm + Jump

Technical Info
--------------

- The engine uses simple JSON wrappers for GLSL fragment and vector shaders. 
That seemed like a pretty good idea at the time, but is now one aspect of the
engine I'm not completely happy about.

- Textures are regular PNG or JPEG (or even SVG!) images loaded by the browser.

- Meshes are stored on a custom JSON based format. (Yeah I know, using ASCII 
for binary data is kind of stupid, but it's easier to load.) Animations are
vertex-based. (Yeah I know.) The source code of a simple converter 
from Quake's `md3` files to this custom format is included under `tools/`.
You'll need to compile it with a C compiler to use it.

- Sylvester is used for Matrix and Vector math. It's probably going to be
slow by today's standards, specially if compared to something using
`Float32Array`s, but it's only used on non-critical sections of the code.

- Maps are tile-based! We have 128x128x128 tiles, as you would expect from a
Sonic engine. :-) The JSON format used should be self-descriptive.

- Objects can be indexed spatially using a grid, to allow for greater
performance when having lots of objects.

- The only form of collision checking available is ray-triangle intersection.

- Check the Web Inspector / Web Console of your browser for (not-so) 
interesting debug messages.

- The camera is always aligned to one of eight axes in relation to the player:

          \  |  /
            \|/
        -----+-----
            /|\
          /  |  \

  This is very important, as it allows the player to move with great precision
  on a 3D environment using only the arrow keys.

FAQ
---

### The control scheme sucks!

*This is not really a question*. Anyway, I like it this way. Feel free to
change it on the source.

### Can I play this with a Joystick?

As of 2011, natively, no. You can use something like JoyToKey if you want it
*that bad*. Expect that to change as progress is done by WHATWG and browser
implementors with the HTML living standard's `<device>` tag.

Known Bugs/Issues
-----------------

- The matrix inversion algorithm used is numerically unstable. This is actually
a Sylvester issue, and might result in wrong lighting on the models when 
they're rotated to specific angles.

- Post-processing effects were *super slow*, and are commented out.

- There's something very wrong with my shadow math. It currently depends on the
camera position, and will break if you change the camera distance, FoV or 
orientation on any axis other than Y.

Cool ideas if you have free time
--------------------------------

### Easy

- Edit the current test level!

- Make a new level!

- Change/add more textures!

### Medium

- Implement new objects!

- Add sound/music support!

### Hard

- Add customizable control schemes!

- Change the shader format to something more reasonable!

- Add support for binary 3d model formats!

- Refactor/clean up the code!

- Fix the shadow code!

- Implement bone-based animation!

- Optimize/enhance post-processing code.

- Make a level editor!

- Implement online multiplayer using something like Socket.IO! (This one is 
pretty cool)

### Near-impossible

- Make a finished game out of this ;D