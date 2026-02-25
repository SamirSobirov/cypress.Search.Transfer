describe('Transfer Product', () => {

  before(() => {
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow - Transfer with Smart Diagnostic', () => {
    cy.viewport(1280, 800);

    // 1. ПЕРЕХВАТ API 
    cy.intercept({ method: 'POST', url: /\/transfers\/offers/ }).as('transferSearch');

    // 2. ЛОГИН
    cy.visit('https://test.globaltravel.space/sign-in');
    
    cy.xpath("(//input[contains(@class,'input')])[1]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.get('body').should('not.contain', 'Ошибка');

    // ПЕРЕХОД НА ТРАНСФЕРЫ
    cy.visit('https://test.globaltravel.space/transfers');

    // 3. ОТКУДА
    cy.get('input[placeholder="Откуда"]').should('be.visible').click({ force: true }).clear();
    cy.get('input[placeholder="Откуда"]').type('Ойбек метро, Ташкент, Узбекистан', { delay: 100 });
    cy.get('.p-autocomplete-item, .p-listbox-item', { timeout: 15000 }).first().click({ force: true });
    cy.wait(1000);

    // 4. КУДА
    cy.get('input[placeholder="Куда"]').should('be.visible').click({ force: true }).clear();
    cy.get('input[placeholder="Куда"]').type('Международный Аэропорт имени Ислама Каримова (TAS), 13-uy, Ташкент, Узбекистан', { delay: 100 });
    cy.get('.p-autocomplete-item, .p-listbox-item', { timeout: 15000 }).first().click({ force: true });
    cy.wait(1000);

    // 5. ДАТА
    cy.get("input[placeholder='Когда']").should('be.visible').click({ force: true });

    cy.get('body').then(($body) => {
      if ($body.find('.p-datepicker-calendar').length === 0) {
        cy.get("input[placeholder='Когда']").click({ force: true });
      }
    });

    cy.get('.p-datepicker-calendar').should('be.visible');

    const today = new Date();
    const targetDay = new Date();
    targetDay.setDate(today.getDate() + 2);

    const dayToSelect = targetDay.getDate();

    if (targetDay.getMonth() !== today.getMonth()) {
      cy.get('.p-datepicker-next').first().should('be.visible').click({ force: true });
      cy.wait(500); 
    }

    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .not('.p-disabled') 
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1000);

    // 6. ПОИСК
    cy.get('button.easy-button.xl.square').should('be.visible').click({ force: true });

    // 7. УМНАЯ ПРОВЕРКА (API + UI)
    cy.wait('@transferSearch', { timeout: 40000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API: HTTP ${statusCode}`);
      }
    });


    cy.get('body').then(($body) => {
      const allCards = $body.find('.offer-card');
      let realTicketsCount = 0;

      allCards.each((index, el) => {
        const cardText = Cypress.$(el).text();
        if (cardText.includes('Выбрать') || cardText.includes('UZS') || cardText.includes('сум')) {
          realTicketsCount++;
        }
      });

      if (realTicketsCount > 0) {
        cy.writeFile('offers_count.txt', realTicketsCount.toString());
        cy.log(`✅ Найдено реальных трансферов: ${realTicketsCount}`);
      } else {
        cy.writeFile('offers_count.txt', '0');
        cy.log('⚪ Трансферов не найдено (или долгая загрузка)');
      }
    });
  });
});