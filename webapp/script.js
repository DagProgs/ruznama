document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('search').value;
  fetch(`/api/locations?query=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = '';
      if (data.results.length === 0) {
        resultsDiv.innerHTML = 'Ничего не найдено.';
        return;
      }
      data.results.forEach(loc => {
        const btn = document.createElement('button');
        btn.textContent = loc.name_cities || loc.name_areas;
        btn.onclick = () => {
          alert(`Местоположение: ${btn.textContent}`);
          // Можно дополнительно вызвать API для получения времени
        };
        resultsDiv.appendChild(btn);
      });
    });
});