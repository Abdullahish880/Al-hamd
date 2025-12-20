import { Component } from '@theme/component';
import { VariantSelectedEvent, VariantUpdateEvent } from '@theme/events';
import { morph } from '@theme/morph';
import { requestYieldCallback, getViewParameterValue } from '@theme/utilities';

export default class VariantPicker extends Component {
  #pendingRequestUrl;
  #abortController;
  #checkedIndices = [];
  #radios = [];

  connectedCallback() {
    super.connectedCallback();

    const fieldsets = this.refs.fieldsets || [];

    fieldsets.forEach((fieldset) => {
      const radios = Array.from(fieldset.querySelectorAll('input'));
      this.#radios.push(radios);

      const checkedIndex = radios.findIndex(
        (radio) => radio.dataset.currentChecked === 'true'
      );

      this.#checkedIndices.push(checkedIndex !== -1 ? [checkedIndex] : []);
    });

    this.addEventListener('change', this.variantChanged.bind(this));
  }

  variantChanged(event) {
    if (!(event.target instanceof HTMLElement)) return;

    const selectedOption =
      event.target instanceof HTMLSelectElement
        ? event.target.options[event.target.selectedIndex]
        : event.target;

    if (!selectedOption) return;

    this.updateSelectedOption(event.target);

    this.dispatchEvent(
      new VariantSelectedEvent({
        id: selectedOption.dataset.optionValueId ?? '',
      })
    );

    const isOnProductPage =
      this.dataset.templateProductMatch === 'true' &&
      !event.target.closest('product-card') &&
      !event.target.closest('quick-add-dialog');

    const currentUrl = this.dataset.productUrl?.split('?')[0];
    const newUrl = selectedOption.dataset.connectedProductUrl;
    const loadsNewProduct = isOnProductPage && newUrl && newUrl !== currentUrl;

    this.fetchUpdatedSection(
      this.buildRequestUrl(selectedOption),
      loadsNewProduct
    );

    const url = new URL(window.location.href);
    const variantId = selectedOption.dataset.variantId || null;

    if (isOnProductPage) {
      variantId
        ? url.searchParams.set('variant', variantId)
        : url.searchParams.delete('variant');
    }

    if (loadsNewProduct) {
      url.pathname = newUrl;
    }

    if (url.href !== window.location.href) {
      requestYieldCallback(() => {
        history.replaceState({}, '', url.toString());
      });
    }
  }

  updateSelectedOption(target) {
    if (target instanceof HTMLInputElement) {
      const fieldsetIndex = Number(target.dataset.fieldsetIndex);
      const inputIndex = Number(target.dataset.inputIndex);

      const fieldset = this.refs.fieldsets?.[fieldsetIndex];
      const radios = this.#radios[fieldsetIndex];
      const checked = this.#checkedIndices[fieldsetIndex];

      if (!fieldset || !radios || !checked) return;

      checked.forEach((i) => {
        radios[i]?.dataset && (radios[i].dataset.currentChecked = 'false');
      });

      checked.unshift(inputIndex);
      checked.length = 2;

      radios[inputIndex].dataset.currentChecked = 'true';
      target.checked = true;
    }

    if (target instanceof HTMLSelectElement) {
      [...target.options].forEach((o) => o.removeAttribute('selected'));
      target.selectedOptions[0]?.setAttribute('selected', 'selected');
    }
  }

  buildRequestUrl(selectedOption) {
    let productUrl =
      selectedOption.dataset.connectedProductUrl ||
      this.#pendingRequestUrl ||
      this.dataset.productUrl;

    this.#pendingRequestUrl = productUrl;

    const params = [];
    const view = getViewParameterValue();
    if (view) params.push(`view=${view}`);

    if (this.selectedOptionsValues.length) {
      params.push(`option_values=${this.selectedOptionsValues.join(',')}`);
    }

    if (
      this.closest('quick-add-component') ||
      this.closest('swatches-variant-picker-component')
    ) {
      productUrl = productUrl.split('?')[0];
      params.unshift('section_id=section-rendering-product-card');
    }

    return `${productUrl}?${params.join('&')}`;
  }

  fetchUpdatedSection(requestUrl, shouldMorphMain = false) {
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    fetch(requestUrl, { signal: this.#abortController.signal })
      .then((res) => res.text())
      .then((htmlText) => {
        this.#pendingRequestUrl = undefined;

        const html = new DOMParser().parseFromString(htmlText, 'text/html');
        html.querySelector('overflow-list[defer]')?.removeAttribute('defer');

        const newVariantId = html.querySelector("[name='id']")?.value;
        if (newVariantId) {
          document.dispatchEvent(
            new CustomEvent('variant:updated', {
              detail: { id: newVariantId },
            })
          );
        }

        const json = html.querySelector(
          `variant-picker script[type="application/json"]`
        )?.textContent;

        if (!json) return;

        if (shouldMorphMain) {
          this.updateMain(html);
        } else {
          const newProduct = this.updateVariantPicker(html);

          if (this.selectedOptionId) {
            this.dispatchEvent(
              new VariantUpdateEvent(
                JSON.parse(json),
                this.selectedOptionId,
                {
                  html,
                  productId: this.dataset.productId,
                  newProduct,
                }
              )
            );
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
  }

  updateVariantPicker(newHtml) {
    const source = newHtml.querySelector(this.tagName.toLowerCase());
    if (!source) throw new Error('Variant picker not found');

    if (source.dataset.productId !== this.dataset.productId) {
      this.dataset.productId = source.dataset.productId;
      this.dataset.productUrl = source.dataset.productUrl;
    }

    morph(this, source);
  }

  updateMain(newHtml) {
    const main = document.querySelector('main');
    const newMain = newHtml.querySelector('main');
    if (!main || !newMain) return;
    morph(main, newMain);
  }

  get selectedOption() {
    return this.querySelector(
      'select option[selected], fieldset input:checked'
    );
  }

  get selectedOptionId() {
    return this.selectedOption?.dataset.optionValueId;
  }

  get selectedOptionsValues() {
    return [...this.querySelectorAll('select option[selected], fieldset input:checked')].map(
      (o) => o.dataset.optionValueId
    );
  }
}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}
