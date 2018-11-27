window.Term_Project = window.classes.Term_Project =
class Term_Project extends Scene_Component
{ 
  constructor( context, control_box )     // The scene begins by requesting the camera, shapes, and materials it will need.
  { super(   context, control_box );    // First, include a secondary Scene that provides movement controls:
    if( !context.globals.has_controls   ) 
      context.register_scene_component( new Movement_Controls( context, control_box.parentElement.insertCell() ) ); 

    // Initial Camera Position
    context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 0,0,25 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );
    this.initial_camera_location = Mat4.inverse( context.globals.graphics_state.camera_transform );

    const r = context.width/context.height;
    context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );
    //context.globals.graphics_state.projection_transform = Mat4.orthographic()   // Orthographic camera??  DELETE

    // Available Shapes
    const shapes = {
                      triangle:       new Triangle(),
                      square:         new Square(),
                      tetrahedron:    new Tetrahedron(),
                      windmill:       new Windmill(),
                      cube:           new Cube(),
                      cubeOuline:     new Cube_Outline(),
                      line:           new Line_Segment_Array(),
                      sphere:         new Subdivision_Sphere(4),
                      gridSphere:     new Grid_Sphere(10, 10),
                      //grid:           new Grid_Patch(10, 10),
                      torus:          new Torus(),
                      closedCone:     new Closed_Cone(30, 30),
                      cappedCylinder: new Capped_Cylinder(30, 30),
                      roundedCylinder:new Rounded_Capped_Cylinder(30, 30),
                      axis:           new Axis_Arrows()  
                   }
    this.submit_shapes( context, shapes );


    // Available Materials
    this.materials =
                    { 
                      phong: context.get_instance( Phong_Shader ).material( Color.of( 1,1,0,1 ) ), // Parameters: shader, color, ambient, diffusivity, specularity, smoothnes
                      bird: context.get_instance( Phong_Shader ).material( this.basicColors('yellow') ),
                      pipe: context.get_instance( Phong_Shader ).material( this.basicColors('green') ),
                      ground: context.get_instance( Phong_Shader ).material( Color.of( 0,0,0,1 ), {ambient: 1, texture: context.get_instance( "assets/dirt.png")} ),
                      sky1: context.get_instance( Phong_Shader ).material( Color.of( 0,0,0,1 ), {ambient: 1, texture: context.get_instance("assets/sky1.png")} ),
                      sky2: context.get_instance( Phong_Shader ).material( Color.of( 0,0,0,1 ), {ambient: 1, texture: context.get_instance( "assets/sky2.png")} ),
                      sky1s: context.get_instance( Texture_Scroll_X ).material( Color.of( 0,0,0,1 ), {ambient: 1, texture: context.get_instance("assets/sky1.png", true)} )
                  
                    }


    // Available Lights
    this.lights = [ new Light( Vec.of( -5,5,5,1 ), Color.of( 0,1,1,1 ), 100000 ) ];


    // Available Sounds
    this.sounds = {
                    birdflap: new Audio('assets/birdflap.wav'),
                    BG: new Audio('assets/BG.mp3')
                  };



    /****************
      Class Variables
    ****************/
    this.muteMusic = true;
    this.showBoundaries = false; // DELETE
    this.maxHeight = 10;
    this.maxWidth = 18;
    this.play = false

    // Bird
    this.birdPositionOriginal = this.birdPosition = Mat4.identity().times(Mat4.rotation(Math.PI/2, [0, 1, 0]));
    this.birdPositionHeight = this.birdPosition[1][3];
    this.birdAcceleration = -0.25 / 60;
    this.birdSpeed = 0.0;

    // Ground
    this.groundSize = 7
    this.groundHeight = -(this.maxHeight - 1);
    this.groundModelTransform = Mat4.identity().times(Mat4.translation( [-(this.maxWidth + 2), this.groundHeight, 0] ) )
                                               
    this.groundXTranslation = 0; // translate ground left by this amount every frame, this is incremented every frame
    this.groundSpeed = 0.2; // decrement groundXTranslation by this amount at each display
    this.groundMaxXTranslation = -20; // used to simulate an infinite ground since there is only a finite # of ground cubes

    // Pipes
    this.pipePositionBottom = Mat4.identity().times(Mat4.translation([this.maxWidth, this.groundHeight + 1, 0])).times(Mat4.rotation(Math.PI/2, [1, 0, 0]));
    this.pipePositionUpper = Mat4.identity().times(Mat4.translation([this.maxWidth, this.maxHeight, 0])).times(Mat4.rotation(Math.PI/2, [1, 0, 0]));
    this.maxPipes = 6;
    this.pipes = [];
    this.distanceTraveled = 0.0;
    this.pipeSpeed = -5.0; // this is actually the number we divide 1 by to obtain pipe speed, did this to avoid rounding error
    this.maxPipeHeight = 16

    // old code for pipes below, uncomment if you want to refactor back to a fixed length rather than dynamic length array
    // this.pipes = new Array(this.maxPipes).fill(null).map(()=>new Array(3).fill(null));  // Each element, a pipe, holds [0] = its position (Mat4),
//     for(var i = 0; i < this.maxPipes; i++)                                             // [1] = its speed, [2] = its X coordinate, [3] = its height, [4] = 'top' or 'bottom'
//     {
//       this.pipes[i][0] = this.pipePositionBottom;
//       this.pipes[i][1] = 0;                        // Initial pipe's speed is 0
//       this.pipes[i][2] = this.pipes[i][0][0][3];   // Pipe's X coordinate
//       this.pipes[i][3] = 1;                        // Initial pipe's height
//       this.pipes[i][4] = 'bottom';                 // ALl pipes start at the bottom
//     }
    

  }



  /**************************************************************
    Returns a chosen color with the specified opacity (0.0 - 1.0)
    If color is not found, returns white
    If opacity is not of range, returns opaque (opacity = 1.0)
  **************************************************************/
  basicColors(color, opacity = 1)
  {
    if(opacity < 0.0 || opacity > 1.0)
      opacity = 1.0;

    switch (color)
    {
      case 'red':     return Color.of(1, 0, 0, opacity);
      case 'green':   return Color.of(0, 1, 0, opacity);
      case 'blue':    return Color.of(0, 0, 1, opacity);
      case 'yellow':  return Color.of(1, 1, 0, opacity);
      case 'cyan':    return Color.of(0, 1, 1, opacity);
      case 'magenta': return Color.of(1, 0, 1, opacity);
      case 'gray':    return Color.of(0.5, 0.5, 0.5, opacity);
      case 'maroon':  return Color.of(0.5, 0, 0, opacity);
      case 'purple':  return Color.of(0.5, 0, 0.5, opacity);
      case 'black':   return Color.of(0, 0, 0, opacity);
      case 'white':   return Color.of(1, 1, 1, opacity);

      default:      return Color.of(1, 1, 1, 1);
    }
  }



  /**************
    Control Panel
  **************/
  make_control_panel()
  { 
    /* Obsolete
    this.key_triggered_button( "Move up",         [ "i" ], () => { this.moveBird('up') } );
    this.key_triggered_button( "Move down",       [ "k" ], () => { this.moveBird('down') } );
    this.new_line();
    */
    this.key_triggered_button( "Play",      [ "p" ], () => { this.play = true } );
    this.key_triggered_button( "Jump",            [ "j" ], () => { this.gameOver = false; this.moveBird('jump');  } );
    this.new_line();
    this.key_triggered_button( "Show Boundaries", [ "b" ], () => { this.showBoundaries = !this.showBoundaries } );     // DELETE
    this.new_line()
    this.key_triggered_button( "Mute Music",      [ "m" ], () => { this.muteMusic = !this.muteMusic } );

    /* FOR REFERENCE
    this.key_triggered_button( "Change Colors", [ "c" ], this.set_colors );    // Add a button for controlling the scene.


    this.key_triggered_button( "Outline",[ "o" ], () => {
                                                          this.outline = !this.outline
                                                        } )
      
    this.key_triggered_button( "View solar system",  [ "0" ], () => this.attached = () => this.initial_camera_location );
    */
  }

  /**************************************************************
    Generate a pair of pipes and push them to end of pipe array
  **************************************************************/
  addPipes()
  {
    var pipeHeight = this.getRandInteger(1, this.maxPipeHeight);
    this.pipes.push([]);
    this.pipes[this.pipes.length - 1].push(this.pipePositionBottom.times(Mat4.scale([1, 1, pipeHeight])));
    this.pipes[this.pipes.length - 1].push(1.0/this.pipeSpeed);                        // Initial pipe's speed is 0
    this.pipes[this.pipes.length - 1].push(this.pipes[this.pipes.length - 1][0][0][3]);   // Pipe's X coordinate
    this.pipes[this.pipes.length - 1].push(pipeHeight);                        // Initial pipe's height
    this.pipes[this.pipes.length - 1].push('bottom');                 // ALl pipes start at the bottom
    this.pipes.push([]);
    this.pipes[this.pipes.length - 1].push(this.pipePositionUpper.times(Mat4.scale([1, 1, 23 - pipeHeight])));
    this.pipes[this.pipes.length - 1].push(1.0/this.pipeSpeed);                        // Initial pipe's speed is 0
    this.pipes[this.pipes.length - 1].push(this.pipes[this.pipes.length - 1][0][0][3]);   // Pipe's X coordinate
    this.pipes[this.pipes.length - 1].push(23 - pipeHeight);                        // Initial pipe's height
    this.pipes[this.pipes.length - 1].push('top');                 // ALl pipes start at the bottom
  }


  /***************************************************************************
    Moves the bird specified by the parameter (up, down, jump, gravity, reset)
    Limits the movement to +- 10 from origin
  ***************************************************************************/
  moveBird(direction)
  {
    switch(direction)
    {
      case 'up':
        if ( this.birdPositionHeight < this.maxHeight)
          this.birdPosition = this.birdPosition.times(Mat4.translation([0, 1, 0]))
        break;


      case 'down':
        if ( this.birdPositionHeight > -1 * this.maxHeight)
          this.birdPosition = this.birdPosition.times(Mat4.translation([0, -1, 0]))
        break;


      case 'jump':
        var offset = 0.0005 * this.birdPositionHeight // Offset intended to make the jump less excessive as it approaches max height 
                                                      // and more excessive as it approaches -max height
        this.birdSpeed += 0.35 - offset
        this.playSound("birdflap")
        break;


      case 'gravity':
        if ( this.birdPositionHeight < this.maxHeight && this.birdPositionHeight > this.groundHeight + 2)
        {
          var offset = 0                      // Meant to increase the acceleration(gravity) as bird approaches max height to make game feel more dynamic
          if (this.birdPositionHeight > -5)
            offset = -0.0015 * Math.abs(this.birdPositionHeight)

          this.birdSpeed += this.birdAcceleration + offset;
          this.birdPosition = this.birdPosition.times(Mat4.translation([0, this.birdSpeed, 0]))
        }

        else if (this.birdPositionHeight >= this.maxHeight)
        {
          this.birdSpeed = 0
          this.birdPosition = this.birdPositionOriginal.times(Mat4.translation([0, 9.9, 0]))
        }

        else
          this.moveBird('reset')

        break;


      case 'reset':
        this.birdPosition = this.birdPositionOriginal
        this.birdSpeed = 0.0
        this.movePipes('reset')
        this.play = false
        break;
    }
  
  }

  

  /**********************************
    Updates the position of the pipes
  **********************************/
  movePipes(mode = 'normal')
  {
    // Old reset condition for fixed sized pipe array
//     if (mode == 'reset')
//     {
//       for(var i = 0; i < this.maxPipes; i++)
//       {
//         this.pipes[i][0] = this.pipePositionBottom
//         this.pipes[i][1] = 0                        // Initial pipe's speed is 0
//         this.pipes[i][2] = this.pipes[i][0][0][3]   // Pipe's X coordinate
//         this.pipes[i][3] = 1                        // Initial pipe's height
//         this.pipes[i][4] = 'bottom'                 // ALl pipes start at the bottom
//       }

//       return
//     }

    // new reset condition for dynamically sized pipe array
    if (mode=='reset') { 
      this.pipes = [];
      this.distanceTraveled = 0.0;
    }

    // Pipe's speed
    this.distanceTraveled += 1.0;
    if (this.pipes.length < 1) {
       this.addPipes();
    }
    if(Math.abs(this.distanceTraveled % (-60)) < 0.01) {
       this.addPipes();
    }
    // For each pipe..
    var i = 0;
    while(i < this.pipes.length)
    {      

      // Move the pipes
      this.pipes[i][0] = this.pipes[i][0].times(Mat4.translation([this.pipes[i][1], 0, 0]));
      this.pipes[i][2] = this.pipes[i][0][0][3];  // Update pipe's X coordinate
      // If the pipe goes out of boundary...
      if ( this.pipes[i][2] < -1 * this.maxWidth )
      {
        this.pipes.splice(i, 1);

      // old code for fixed pipe length
//         this.pipes[i][1] = pipeSpeed ; // Change its assigned speed
        
//         var pipeHeight = this.getRandInteger(1, 20);

//         // Respawn the pipe randomizing it's location (top or bottom)
//         var chance = this.getRandInteger(0, 100);
//         if (chance < 30)
//         { // Also randomize how far away it respawns, and its height
//           this.pipes[i][0] = this.pipePositionUpper.times(Mat4.translation([6 * i, 0, 0])).times(Mat4.scale([1, 1, pipeHeight]));
//           this.pipes[i][3] = pipeHeight;
//           this.pipes[i][4] = 'top';
//         }    

//         else
//         {
//           this.pipes[i][0] = this.pipePositionBottom.times(Mat4.translation([6 * i, 0, 0])).times(Mat4.scale([1, 1, pipeHeight]));
//           this.pipes[i][3] = pipeHeight;
//           this.pipes[i][4] = 'bottom';
//         }    
      }
      else {
        i += 1;
      }

    }
  }



  /*********************************************
    Checks for collisions between bird and pipes
  *********************************************/
  checkCollision()
  {
    var heightMapping = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]

    // For each pipe..
    for(var i = 0; i < this.pipes.length; i++)
    { 
      var xCoord = this.pipes[i][2]                  // Get its X coordinate
      var height = Math.round(this.pipes[i][3] / 2)  // Get its height
      var topORbottom = this.pipes[i][4]             // Get its position

      if (xCoord >= -1 && xCoord <= 1)
      {      
        if (topORbottom == 'bottom' && this.birdPositionHeight < 0)
        {
          if (heightMapping[Math.round(Math.abs(this.birdPositionHeight))] <= height)
            this.moveBird('reset')
        }

        else if (topORbottom == 'top' && this.birdPositionHeight > 0)
        {
          if (this.birdPositionHeight >= heightMapping[height])
            this.moveBird('reset')
        }

        else if (height == 10 && this.birdPositionHeight >= -1 && this.birdPositionHeight <= 1 )
          this.moveBird('reset')
      }
    }
  }



  /********
    Display
  ********/
  display( graphics_state )
  { 
    graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
    const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;
    const FPS = 1 / dt  // Frames per second
    
    
    // Draw Bundaries - DELETE
    if (this.showBoundaries)
    {
      this.shapes.axis.draw( graphics_state, Mat4.identity(), this.materials.phong.override( {color: this.basicColors('cyan', 0.5) }) );

      this.shapes.cube.draw( graphics_state, Mat4.identity().times(Mat4.translation([0, this.maxHeight, 0])).times(Mat4.rotation(Math.PI/2, [1, 0, 0])).times(Mat4.scale([1, 1, 0.1])),
                                                               this.materials.phong.override( {color: this.basicColors('red', 0.5) }) );

      this.shapes.cube.draw( graphics_state, Mat4.identity().times(Mat4.translation([0, -1 * this.maxHeight, 0])).times(Mat4.rotation(Math.PI/2, [1, 0, 0])).times(Mat4.scale([1, 1, 0.1])),
                                                               this.materials.phong.override( {color: this.basicColors('red', 0.5) }) );

      this.shapes.cube.draw( graphics_state, Mat4.identity().times(Mat4.translation([this.maxWidth, 0, 0])).times(Mat4.rotation(Math.PI/2, [0, 1, 0])).times(Mat4.scale([1, 1, 0.1])),
                                                               this.materials.phong.override( {color: this.basicColors('red', 0.5) }) );

      this.shapes.cube.draw( graphics_state, Mat4.identity().times(Mat4.translation([-1 * this.maxWidth, 0, 0])).times(Mat4.rotation(Math.PI/2, [0, 1, 0])).times(Mat4.scale([1, 1, 0.1])),
                                                               this.materials.phong.override( {color: this.basicColors('red', 0.5) }) );
    }

    
    // Play background music every ~20 seconds
    if (!this.muteMusic && (Math.round(t) % 20 == 0 || Math.floor(t) == 3))
      this.playSound("BG", 0.05)


    // Move and Draw Bird
    this.birdPositionHeight = this.birdPosition[1][3] // Bird's Height
    if (this.play) this.moveBird('gravity')
    this.shapes.closedCone.draw(graphics_state, this.birdPosition, this.materials.bird) 


    // Move and Draw Pipes
    if (this.play) this.movePipes()
    for(var i = 0; i < this.pipes.length; i++)
      this.shapes.cappedCylinder.draw(graphics_state, this.pipes[i][0], this.materials.pipe)

    // Draw Ground
    for(var i = 0; i < this.maxWidth * 4; i += 2) {
      let model = this.groundModelTransform.times( Mat4.translation( [i + this.groundXTranslation, 0, 0] ) )
                                           .times(Mat4.scale( [ this.groundSize, 1, this.groundSize ] ) )
      this.shapes.cube.draw(graphics_state, model, this.materials.ground)
    }
    

    // Simulate an infinite ground
    if (this.play)
      if (this.groundXTranslation < this.groundMaxXTranslation)
        this.groundXTranslation = -this.groundSpeed
      else
        this.groundXTranslation -= this.groundSpeed
    

    // Check for collisions
    this.checkCollision()


    // Draw sky

    if (this.play){
      for ( var i = 0; i < 18; i+= 1)
      {
        let model_transform = Mat4.identity();
        model_transform = model_transform.times(Mat4.translation([-270, 0, -7]))
                                         .times(Mat4.translation([i*30, 0, 0]))
                                         .times(Mat4.scale([15, 15, .0001]));
        this.shapes.cube.draw(graphics_state, model_transform, this.materials.sky1s);
      }
    }
    else 
    {
      for ( var i = 0; i < 18; i+= 1)
      {
        let model_transform = Mat4.identity();
        model_transform = model_transform.times(Mat4.translation([-270, 0, -7]))
                                         .times(Mat4.translation([i*30, 0, 0]))
                                         .times(Mat4.scale([15, 15, .0001]));
        this.shapes.cube.draw(graphics_state, model_transform, this.materials.sky1);
      }
    }
// for(var i = 0; i < this.maxWidth * 4; i += 2) {
//       let model = this.groundModelTransform.times( Mat4.translation( [i + this.groundXTranslation,10 , -50] ) )
//                                            .times(Mat4.scale( [ this.groundSize, this.groundSize, this.groundSize ] ) )
//       this.shapes.cube.draw(graphics_state, model, this.materials.sky3)
//     }


//     if (this.play)
//     {
//       totalSeconds += this.play;
//       var scrollSpeed = 100;
// //        var numImages = Math.ceil(canvas.width / img.width) + 1;
// var xpos = totalSeconds * scrollSpeed % 1358;

//     }




    /* REFERENCE
    // Setup Sun Light
    let sunLight  = [ new Light ( Vec.of( 0,0,0,1 ), Color.of(sunColorRed, 0, sunColorBlue, 1), 10 ** sunScale) ]
    graphics_state.lights = sunLight

    this.shapes.sphere.draw(graphics_state, planet, this.materials.planet.override( {color: Color.of(0.2, 1, 0.5, 1), specularity: 1, diffusivity: 0.2, gouraud: 1} ))

    this.initial_camera_location = Mat4.look_at( Vec.of( 0,10,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ).map( (x,i) => Vec.from( graphics_state.camera_transform[i] ).mix( x, 0.1 ) )
    */

  }


  
  /*****************
    Helper Functions
  *****************/

  // Returns a random number between min and max (both included)
  getRandInteger(min, max) 
  { return Math.floor(Math.random() * (max - min + 1) ) + min; }


  // Plays the specified sound
  playSound(name, volume = 1)
    { if( 0 < this.sounds[ name ].currentTime && this.sounds[ name ].currentTime < .3 ) return;
      this.sounds[ name ].currentTime = 0;
      this.sounds[ name ].volume = Math.min(Math.max(volume, 0), 1);;
      this.sounds[ name ].play();
    }

}


// Sky Scrolling Background

class Texture_Scroll_X extends Phong_Shader
{ fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    {
      // TODO:  Modify the shader below (right now it's just the same fragment shader as Phong_Shader) for requirement #6.
      return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.di
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }                                 // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
          vec2 mVector = f_tex_coord; 
          mat4 mMatrix = mat4(vec4(1., 0., 0., 0.), vec4(0., 1., 0., 0.), vec4( 0., 0., 1., 0.), vec4( mod(1. * animation_time, 88.) , 0., 0., 1.)); 
          vec4 tempVector = vec4(mVector, 0, 0); 
          tempVector = tempVector + vec4(1., 1., 0., 1.); 
          tempVector = mMatrix * tempVector; 

          vec4 tex_color = texture2D( texture, tempVector.xy );                         // Sample the texture image in the correct place.
                                                                                      // Compute an initial (ambient) color:
          if( USE_TEXTURE ) gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          else gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
          gl_FragColor.xyz += phong_model_lights( N );                     // Compute the final color with contributions from lights.
        }`;
    }
}