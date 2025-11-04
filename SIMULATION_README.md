# 🎮 The Simulation - Twitch Interactive POC

An interactive Twitch show where viewers control visual simulations through chat commands. This proof-of-concept features a particle system that responds to real-time chat input.

## 🌟 Features

- **Real-time Twitch Chat Integration** using tmi.js
- **Interactive Particle System** built with p5.js
- **Chat Commands** that modify the simulation instantly
- **OBS Browser Source Compatible** for streaming
- **Single HTML File** for easy GitHub Pages deployment

## 🎯 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!spawn` | Adds 10 particles at the center | `!spawn` |
| `!gravity [direction]` | Changes gravity direction | `!gravity up` |
| `!clear` | Removes all particles | `!clear` |
| `!speed [1-10]` | Adjusts particle speed | `!speed 5` |
| `!color [mode]` | Changes particle colors | `!color red` |
| `!explode` | Creates an explosion effect | `!explode` |

### Command Details

- **Gravity directions**: `up`, `down`, `left`, `right`
- **Color modes**: `red`, `blue`, `green`, `rainbow`
- **Speed range**: 1 (slowest) to 10 (fastest)

## 🚀 Setup Instructions

### Step 1: Configure the Application

1. Copy the example config file:
   ```bash
   cp config.example.js config.js
   ```

2. Edit `config.js` with your Twitch channel name:
   ```javascript
   const TWITCH_CONFIG = {
       channel: 'your_channel_name'      // Your Twitch channel (lowercase)
   };
   ```

3. Save the file. The `.gitignore` will prevent it from being committed.

**Note**: The simulation uses anonymous chat connection (read-only), so no OAuth token is needed! It can read chat commands but won't send messages back.

### Step 2: Test Locally

1. You'll need a local web server (can't just open the HTML file due to CORS):

   **Option A: Using Python 3**
   ```bash
   python -m http.server 8000
   ```

   **Option B: Using Python 2**
   ```bash
   python -m SimpleHTTPServer 8000
   ```

   **Option C: Using Node.js**
   ```bash
   npx http-server -p 8000
   ```

   **Option D: Using VS Code**
   - Install the "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

2. Open your browser to `http://localhost:8000`

3. Check the console (F12) for connection status

4. Test commands in your Twitch chat!

### Step 3: Deploy to GitHub Pages

1. **Create a new repository** on GitHub (or use existing)

2. **Push your code** (config.js will be ignored):
   ```bash
   git add index.html config.example.js .gitignore
   git commit -m "Add Twitch simulation POC"
   git push origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click "Settings" → "Pages"
   - Under "Source", select "main" branch and "/ (root)"
   - Click "Save"

4. **Add your config to GitHub Pages**:
   - Use GitHub's web interface to create `config.js` directly in the repo
   - Or commit it to your repository (it only contains your channel name, no secrets!)
   - Since we're using anonymous chat, it's safe to commit `config.js`

5. Your site will be live at: `https://your-username.github.io/your-repo-name/`

### 🔒 Security Note

Since the simulation uses **anonymous chat connection**, there are no credentials to protect! The `config.js` file only contains your public Twitch channel name, so it's safe to commit to your repository. The `.gitignore` is set up to exclude it by default for consistency, but you can safely add it if needed for deployment.

## 🎥 Add to OBS as Browser Source

1. Open OBS Studio
2. Add a new source: "Browser"
3. Configure the source:
   - **URL**: Your GitHub Pages URL or `http://localhost:8000` for local testing
   - **Width**: 1920 (or your stream resolution)
   - **Height**: 1080 (or your stream resolution)
   - **FPS**: 60
   - ✅ Check "Refresh browser when scene becomes active"
   - ✅ Check "Shutdown source when not visible" (optional, saves resources)

4. Optional: Right-click the source → "Filters" → Add "Chroma Key" if you want transparency

### OBS Tips

- **Performance**: Lower FPS to 30 if you experience lag
- **Interaction**: You can click the preview in OBS to spawn particles
- **Scaling**: Use OBS's transform tools to position/resize the simulation
- **Multiple Scenes**: The simulation will reconnect when the scene becomes active

## 🏗️ Architecture Overview

The code is structured in three main classes:

### 1. **Particle Class** (`index.html:24`)
- Represents individual particles
- Handles physics (position, velocity, acceleration)
- Manages visual properties (color, size, lifespan)
- Implements edge bouncing behavior

### 2. **SimulationEngine Class** (`index.html:71`)
- Manages the particle system
- Processes simulation parameters (gravity, speed, color mode)
- Provides methods for chat commands to modify behavior
- Handles performance limits

### 3. **TwitchChatController Class** (`index.html:138`)
- Connects to Twitch IRC using tmi.js
- Listens for chat messages
- Parses and executes commands
- Links chat input to simulation modifications

### 4. **P5.js Sketch** (`index.html:249`)
- Main animation loop
- Renders the simulation each frame
- Handles window resizing
- Provides mouse interaction for testing

## 🎨 Customization Guide

### Adding New Commands

1. Add a new case in `handleCommand()` method (`index.html:189`):
```javascript
case '!yourcommand':
    // Your command logic here
    this.simulation.yourMethod();
    break;
```

2. Add the corresponding method to `SimulationEngine` class:
```javascript
yourMethod() {
    // Modify particles or simulation state
}
```

### Swapping Simulations

The particle system is modular. To create a different simulation:

1. Replace the `Particle` class with your simulation entity (e.g., `Boid`, `Wave`, `Branch`)
2. Update `SimulationEngine` to manage your new entities
3. Keep the `TwitchChatController` unchanged
4. Modify command handlers to control your new simulation

### Styling

- Change colors in the CSS section (`index.html:10-51`)
- Modify particle colors in `Particle.display()` (`index.html:50`)
- Adjust background fade in `p.draw()` (`index.html:271`)

## 🧪 Testing Without Twitch

You can test the simulation without Twitch:

1. Click anywhere on the canvas to spawn particles
2. Open the browser console (F12)
3. Manually trigger commands:
   ```javascript
   simulation.addParticles(20);
   simulation.setGravity('up');
   simulation.setSpeed(2.0);
   simulation.clear();
   ```

## 🐛 Troubleshooting

### "Twitch: No Config" Status
- Make sure you created `config.js` from `config.example.js`
- Check that the file is in the same directory as `index.html`
- Verify your channel name is correct (lowercase)

### "Twitch: Disconnected" Status
- Check your internet connection
- Make sure the channel name is correct and exists on Twitch
- The channel must be live or have recent chat activity
- Check browser console for error messages

### Commands Not Working
- Make sure commands start with `!`
- Check that you're in the correct Twitch channel
- Verify the simulation is connected (status shows "Connected")
- Look for command responses in the browser console
- Try sending a test command like `!spawn` in your chat

### Performance Issues
- Reduce max particles in `SimulationEngine` constructor (`index.html:76`)
- Lower FPS in OBS Browser Source settings
- Close other applications using GPU/CPU
- Try a simpler color mode (not 'rainbow')

### CORS Errors When Testing Locally
- Use a local web server (see Step 3 above)
- Don't open the HTML file directly in your browser

## 🎭 Ideas for Future Simulations

### 1. **Flocking Behavior (Boids)**
- Chat commands to adjust separation, alignment, cohesion
- `!flock [size]` - Create a flock of birds/fish
- `!predator` - Add a predator that chases boids
- `!wind [direction]` - Add environmental forces

### 2. **Fractal Tree Growth**
- `!grow` - Grow the tree
- `!branch [angle]` - Adjust branching angle
- `!prune` - Remove branches
- `!season [spring/summer/fall/winter]` - Change colors

### 3. **Wave Interference Patterns**
- `!wave [x] [y]` - Create a wave source at coordinates
- `!frequency [1-10]` - Adjust wave frequency
- `!amplitude [1-10]` - Adjust wave amplitude
- Color based on wave intensity

### 4. **Conway's Game of Life**
- `!glider` - Spawn glider pattern
- `!random` - Random seed
- `!speed [1-10]` - Simulation speed
- Viewers place cells by voting in chat

### 5. **Gravitational N-Body Simulation**
- `!star [size]` - Add a star with mass
- `!planet` - Add orbiting planets
- `!blackhole` - Add a black hole that attracts everything
- `!collision [on/off]` - Toggle collision physics

### 6. **Drawing/Paint Mode**
- `!brush [size]` - Change brush size
- `!color [hex]` - Set color
- `!line [x1] [y1] [x2] [y2]` - Draw line
- `!fill` - Flood fill areas
- `!undo` - Remove last drawing

### 7. **Maze Generator & Solver**
- `!generate` - Create a new maze
- `!solve` - Show solution
- `!size [small/medium/large]` - Maze size
- Viewers vote on path directions

### 8. **Reaction-Diffusion Patterns**
- Creates organic, coral-like patterns
- `!feed [rate]` - Adjust feed rate
- `!kill [rate]` - Adjust kill rate
- `!seed` - Add pattern seeds
- Beautiful, mesmerizing visuals

### 9. **Music Visualizer**
- Connect to Spotify API or audio input
- `!bass` - Emphasize bass frequencies
- `!treble` - Emphasize high frequencies
- `!style [bars/waves/circles]` - Visualization style

### 10. **Collaborative Pixel Art**
- Grid-based canvas
- `!pixel [x] [y] [color]` - Place a pixel
- `!template [image]` - Load template
- Time-lapse at end of stream

### 11. **Physics Sandbox**
- `!box` - Add rigid body boxes
- `!ball` - Add bouncing balls
- `!rope` - Create rope/chain
- `!cannon [angle]` - Fire projectiles
- Uses Matter.js or Box2D

### 12. **Terrain Generator**
- Perlin noise-based landscapes
- `!mountain` - Add mountains
- `!valley` - Create valleys
- `!water [level]` - Set water level
- `!biome [desert/forest/snow]` - Change theme

### 13. **Fireworks Show**
- `!launch [color]` - Launch firework
- `!finale` - Epic finale with many fireworks
- `!trail [on/off]` - Particle trails
- Synchronized to music/events

### 14. **Starfield / Space Scene**
- `!warp [speed]` - Warp speed effect
- `!stars [count]` - Star density
- `!nebula` - Add nebula clouds
- `!planet` - Add planets/moons

### 15. **Chat-Driven Story/RPG**
- Visual representation of story state
- `!north/south/east/west` - Navigate
- `!fight/flee` - Combat choices
- `!inventory` - Show items
- Branching narrative based on votes

## 🏆 Advanced Features to Add

- **Command Cooldowns**: Prevent spam with per-user or per-command cooldowns
- **Permissions**: Restrict certain commands to mods/subscribers
- **Analytics**: Track most-used commands, active participants
- **Leaderboard**: Show who triggered the most actions
- **Presets**: Save/load simulation states
- **Recording**: Capture and replay interesting moments
- **Multi-Channel**: Connect to multiple channels simultaneously
- **Voice Commands**: Integrate with speech recognition
- **Mobile Control**: Touch interface for testing
- **AI Integration**: Use AI to generate simulation parameters

## 📚 Resources

- **p5.js Documentation**: https://p5js.org/reference/
- **tmi.js Documentation**: https://github.com/tmijs/tmi.js
- **Twitch Chat Commands**: https://dev.twitch.tv/docs/irc
- **OBS Documentation**: https://obsproject.com/wiki/
- **GitHub Pages**: https://pages.github.com/

## 🤝 Contributing

This is a proof-of-concept! Feel free to:
- Add new commands
- Create new simulations
- Improve performance
- Enhance visual effects
- Add sound effects (using p5.sound.js)

## 📝 License

This is a personal project. Feel free to fork and modify for your own streams!

## 🎉 Credits

Built with:
- [p5.js](https://p5js.org/) - Creative coding library
- [tmi.js](https://tmijs.github.io/tmi.js/) - Twitch chat library

---

**Made for "The Simulation" - Where chat controls reality ✨**

Need help? Check the browser console (F12) for detailed logs and error messages.
