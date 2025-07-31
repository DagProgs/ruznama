bot.start((ctx) => {
  addUser(ctx.from.id);
  return ctx.replyWithHTML(
    `🕌 <b>Добро пожаловать в «Рузнама»</b>
` +
      `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)
` +
      `📍 Выберите раздел или введите название населённого пункта.
` +
      `🕋 Благодать начинается с намерения.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📱 Открыть приложение', web_app: { url: 'https://ruznama-hazel.vercel.app/webapp' } }
          ],
          [
            { text: '🏙️ Города', callback_ 'cmd_cities' },
            { text: '🏘️ Районы', callback_ 'cmd_areas' }
          ],
          [
            { text: '📖 Хадис дня', callback_ 'cmd_quote' }
          ]
        ]
      }
    }
  ).catch(console.error);
});