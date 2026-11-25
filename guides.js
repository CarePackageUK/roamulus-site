const calculator = document.querySelector('#guide-fuel');
if (calculator) {
  const decimal = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  calculator.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(calculator);
    const litres = Number(values.get('distance')) / Number(values.get('mpg')) * 4.54609;
    const cost = litres * Number(values.get('price'));
    calculator.querySelector('output').textContent = `${decimal.format(litres)} litres · ${pounds.format(cost)} estimated fuel cost`;
  });
}

document.querySelector('.guide-print')?.addEventListener('click', () => window.print());
