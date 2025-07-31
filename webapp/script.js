document.getElementById('refresh').addEventListener('click', () => {
  fetch('/api/times/today') // пример API для получения данных
    .then(res => res.json())
    .then(data => {
      document.getElementById('content').innerHTML = `
        <h2>Времена намазов на сегодня</h2>
        <pre>${data.times}</pre>
        <h2>Хадис дня</h2>
        <p>${data.quote}</p>
      `;
    })
    .catch(console.error);
});

// Можно добавить автоматический вызов при загрузке
window.onload = () => {
  document.getElementById('refresh').click();
};