<template>
  <div class="container">
    <h1>Eyas Fresh Setup</h1>
    <p>This is a clean electron-vite installation.</p>
    <button @click="ping">Send Ping to Main</button>
  </div>
</template>

<script setup>
const ping = () => {
  window.electron.ipcRenderer.send('ping');
};
</script>

<style>
.container {
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f0f0f0;
}
h1 {
  color: #333;
}
button {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</button>
</style>
