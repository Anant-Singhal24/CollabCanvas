# 🎨 CollabCanvas - Real-time Collaborative Whiteboard

**CollabCanvas** is a powerful, real-time collaborative whiteboard app that brings your ideas to life — together.  
Whether you're brainstorming, teaching, or just sketching things out, CollabCanvas lets multiple users draw, communicate, and innovate in a shared virtual space.

---

## 🚀 Live Demo

🔗 [Try the Live App]([https://collabcanvas.yourdomain.com](https://collabcanvas-app.onrender.com/))
⏳ Please wait up to 1 minute during initial login. Our server may take a moment to wake up after inactivity. Thanks for your patience!

---

## ✨ Features

- ✅ **Real-time Collaboration** – Multiple users can draw on the same canvas simultaneously  
- ✏️ **Drawing Tools**:
  - Pen tool for freehand drawing  
  - Rectangle & Circle shapes  
  - Text tool for annotations  
  - Eraser for removing content  
  - Selection tool for moving objects  
- 🛠️ **Room Management**:
  - Create public or private rooms  
  - Join via direct links or public list  
  - Admin controls & room deletion  
- 💬 **Real-time Chat** – Communicate directly within rooms  
- 👥 **User Presence** – See who's in the room  
- 🎛️ **Canvas Controls**:
  - Clear canvas with one click  
  - Export canvas as PNG or PDF  
- 📱 **Responsive Design** – Optimized for desktops & tablets  

---

## 🧱 Tech Stack

### 🖥️ Frontend
- **React** – For building dynamic UIs  
- **Vite** – Blazing fast dev server & bundler  
- **Fabric.js** – Canvas rendering and manipulation  
- **Socket.IO Client** – Real-time communication  
- **Tailwind CSS** – Utility-first styling  
- **Lucide React** – Clean and modern icons  
- **Axios** – HTTP client for API calls  

### 🖧 Backend
- **Node.js** – JavaScript runtime  
- **Express.js** – Fast and minimalist server framework  
- **Socket.IO** – WebSockets for real-time features  
- **MongoDB** – NoSQL DB for persistent room data  
- **Mongoose** – MongoDB object modeling  

---

## ⚙️ Setup Instructions

### 📋 Prerequisites
- Node.js (v14 or higher)  
- MongoDB (Local installation or MongoDB Atlas)
### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/collabcanvas.git
cd collabcanvas
```
2. Install dependencies for both client and server
```bash
# Install server dependencies
cd server
npm install
# Install client dependencies
cd ../client
npm install
```
3. Create environment files
**For the server (`.env` in server directory):**
**For the server (`.env` in server directory):**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/collabcanvas
CLIENT_URL=http://localhost:3000
```
**For the client (`.env` in client directory):**
**For the client (`.env` in client directory):**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
4. Start the development servers
In the server directory:
```bash
npm run dev
```
In the client directory:
```bash
npm run dev
```
5. Open your browser and navigate to `http://localhost:3000`
### Building for Production
To build the application for production:
In the client directory:
```bash
npm run build
```
In the server directory:
```bash
npm start
```
## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
## License
This project is licensed under the MIT License - see the LICENSE file for details.
## Acknowledgments
- Fabric.js for the canvas manipulation library
- Socket.IO for the real-time communication features
- Lucide for the beautiful icons
