describe('Transfer Product', () => {

  // 🛡️ АВАРИЙНЫЙ ВЫХОД
  Cypress.on('fail', (error) => {
    cy.writeFile('api_status.txt', '500');
    cy.writeFile('offers_count.txt', 'ERROR');
    throw error;
  });

  before(() => {
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow - Transfer with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // ❗️ ИСПРАВЛЕНИЕ 1: Вернул оригинальный URL для трансферов (он отличается от Авиа)
    cy.intercept('POST', '**/transfer/offers**').as('transferSearch');

    // 1. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in'); 
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.visit('https://test.globaltravel.space/transfers');

    // 2. ОТКУДА
    cy.get('input[placeholder="Откуда"]').should('be.visible').click({ force: true })
      .type('Ойбек метро, Ташкент, Узбекистан', { delay: 100 });
    cy.get('.p-autocomplete-item, .p-listbox-item', { timeout: 15000 }).first().click({ force: true });
    cy.wait(1000);

    // 3. КУДА
    cy.get('input[placeholder="Куда"]').should('be.visible').click({ force: true })
      .type('Международный Аэропорт имени Ислама Каримова (TAS), 13-uy, Ташкент, Узбекистан', { delay: 100 });
    cy.get('.p-autocomplete-item, .p-listbox-item', { timeout: 15000 }).first().click({ force: true });
    cy.wait(1000);

    // 4. ДАТА
    cy.get("input[placeholder='Когда']").click({ force: true });
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .not('.p-disabled')
      .contains(new RegExp(`^${targetDate.getDate()}$`))
      .click({ force: true });
    
    cy.get('body').type('{esc}');
    cy.wait(1000);

    // 5. ПОИСК
    cy.get('button.easy-button.xl.square').should('be.visible').click({ force: true });

    // 6. ПРОВЕРКА API
    cy.wait('@transferSearch', { timeout: 60000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Server Error Transfer: ${statusCode}`);
      }
    });

    cy.wait(15000);

    // 7. ПОДСЧЕТ КАРТОЧЕК
    cy.get('body').then(($body) => {
      // ❗️ ИСПРАВЛЕНИЕ 2: Ищем сразу по нескольким возможным классам
      const allCards = $body.find('.offer-item, .ticket-card, [class*="offer-card"], [class*="transfer"]');
      let realTicketsCount = 0;

      allCards.each((index, el) => {
        const cardText = Cypress.$(el).text();
        // Фильтруем только карточки с ценой/кнопкой
        if (cardText.includes('UZS') || cardText.includes('сум') || cardText.includes('Выбрать')) {
          realTicketsCount++;
        }
      });

      if (realTicketsCount > 0) {
        cy.writeFile('offers_count.txt', realTicketsCount.toString());
      } else {
        cy.writeFile('offers_count.txt', '0');
      }
    });
  });
});