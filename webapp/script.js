// Загружаем и сортируем список мест
async function loadSortedLocations() {
  try {
    const res = await fetch('/api/locations');
    const data = await res.json();

    const all = [
      ...data.cities.map(c => ({ id: c.id, name: c.name_cities, type: 'город' })),
      ...data.areas.map(a => ({ id: a.id, name: a.name_areas, type: 'район' }))
    ];

    // Сортировка по алфавиту (с учётом кириллицы)
    all.sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));

    return all;
  } catch (e) {
    console.error('Ошибка загрузки:', e);
    return [];
  }
}

// Вывести в консоль
loadSortedLocations().then(list => {
  console.log('📋 Полный список (от А до Я):');
  list.forEach(item => {
    console.log(`${item.name.padEnd(20)} | ID: ${item.id} (${item.type})`);
  });
});