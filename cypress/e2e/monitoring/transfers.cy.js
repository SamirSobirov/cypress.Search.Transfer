describe('Transfer Product', () => {

  // 🛡️ ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК
  Cypress.on('fail', (error) => {
    cy.writeFile('api_status.txt', '500');
    cy.writeFile('offers_count.txt', 'ERROR');
    throw error;
  });

  // 1. Инициализация файлов перед запуском
  before(() => {
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow - Transfer with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // Перехват API для трансферов (подправь URL если он отличается в консоли Network)
    cy.intercept('POST', '**/transfer/offers**').as('transferSearch');

    // 1. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.get('body').should('not.contain', 'Ошибка');

    // 2. ПЕРЕХОД В ТРАНСФЕРЫ
    cy.visit('https://test.globaltravel.space/transfers');
    cy.url().should('include', '/transfers');

    // 3. ОТКУДА
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true }).clear()
      .type('Ойбек метро, Ташкент, Узбекистан', { delay: 100 });
    
    cy.get('.p-autocomplete-item, .p-listbox-item', { timeout: 10000 })
      .first().click({ force: true });
    
    cy.wait(1000); 

    // 4. КУДА
    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true }).clear()
      .type('Международный Аэропорт имени Ислама Каримова (TAS), 13-uy, Ташкент, Узбекистан', { delay: 100 });

    cy.get('.p-autocomplete-item, .p-listbox-item', { timeout: 10000 })
      .first().click({ force: true });
    
    cy.wait(1000);

    // 5. ДАТА (Сегодня + 2 дня)
    cy.get("input[placeholder='Когда']").should('be.visible').click({ force: true });
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const dayToSelect = targetDate.getDate();

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .not('.p-disabled')
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1000); 

    // 6. ПОИСК 
    cy.get('button.easy-button.xl.square')
      .should('be.visible')
      .click({ force: true });

    // 7. УМНАЯ ПРОВЕРКА (Как в Avia)
    cy.wait('@transferSearch', { timeout: 60000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API Transfer: HTTP ${statusCode}`);
      }
    });

    // Ожидание рендеринга карточек
    cy.wait(15000);

    // 8. ПОДСЧЕТ РЕЗУЛЬТАТОВ (Через поиск элементов в body)
    cy.get('body').then(($body) => {
      // Ищем карточки предложений (проверь класс карточки трансфера, обычно это .offer-item или похожее)
      const allCards = $body.find('.offer-item, [class*="offer-card"]');
      let realOffersCount = 0;

      allCards.each((index, el) => {
        const cardText = Cypress.$(el).text();
        // Фильтруем только те карточки, где есть цена или кнопка действия
        if (cardText.includes('Выбрать') || cardText.includes('UZS') || cardText.includes('сум')) {
          realOffersCount++;
        }
      });

      if (realOffersCount > 0) {
        cy.writeFile('offers_count.txt', realOffersCount.toString());
        cy.log(`✅ Найдено предложений трансфера: ${realOffersCount}`);
      } else {
        cy.writeFile('offers_count.txt', '0');
        cy.log('⚪ Трансферов не найдено');
      }
    });
  });
});