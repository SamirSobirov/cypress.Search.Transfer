describe('Transfer Product', () => {
  it('Search Flow - Transfer', () => {
    cy.viewport(1280, 800);
    
    // Перехват API для трансферов
    cy.intercept('POST', '**/transfer/offers**').as('transferSearch');

    // 1. АВТОРИЗАЦИЯ (без xpath, чтобы не было ошибок)
    cy.visit('https://test.globaltravel.space/sign-in');

    // Находим инпуты по их позиции или стандартным атрибутам
    cy.get('input').eq(0).should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.get('input').eq(1)
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 40000 }).should('include', '/home');

    // 2. ПЕРЕХОД В ТРАНСФЕРЫ
    cy.visit('https://test.globaltravel.space/transfers');
    cy.url().should('include', '/transfers');

    // 3. ОТКУДА (Ойбек метро)
    // Используем placeholder="Откуда" как на скриншоте
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true })
      .clear()
      .type('Ойбек метро, Ташкент, Узбекистан', { delay: 100 });
    
    // Выбираем из выпадающего списка PrimeVue
    cy.get('.p-autocomplete-item, .p-listbox-item', { timeout: 10000 })
      .first()
      .click({ force: true });
    
    cy.wait(1000); 

    // 4. КУДА (Аэропорт)
    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true })
      .clear()
      .type('Международный Аэропорт имени Ислама Каримова (TAS), 13-uy, Ташкент, Узбекистан', { delay: 100 });

    cy.get('.p-autocomplete-item, .p-listbox-item', { timeout: 10000 })
      .first()
      .click({ force: true });
    
    cy.wait(1000);

    // 5. ДАТА (Сегодня + 2 дня)
    cy.get("input[placeholder='Когда']").click({ force: true });
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const dayToSelect = targetDate.getDate();

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1000); 

    // 6. ПОИСК (Обновленный класс по вашему скриншоту)
    // Используем точный набор классов: p-button-icon-only easy-button xl square
    cy.get('button.easy-button.xl.square')
      .should('be.visible')
      .click({ force: true });

    // 7. ПРОВЕРКА РЕЗУЛЬТАТА
    cy.wait('@transferSearch', { timeout: 60000 }).then((interception) => {
      expect(interception.response.statusCode).to.be.oneOf([200, 201]);

      const body = interception.response.body;
      const offersList = body.offers || body.data || (Array.isArray(body) ? body : []);
      const count = offersList.length;

      cy.log(`DEBUG: Found ${count} transfer offers`);
      cy.writeFile('offers_count.txt', count.toString());
      
      if (count > 0) {
        // Проверка наличия карточек на странице
        cy.get('.offer-item, [class*="offer"]', { timeout: 20000 }).should('exist');
      }
    });
  });
});