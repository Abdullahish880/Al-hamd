document.addEventListener('DOMContentLoaded', function () {
  const wrapper = document.querySelector('.before-after-wrapper');
  const afterContent = document.querySelector('.after-content');
  const handle = document.querySelector('.before-after-handle');

  if (!wrapper || !afterContent || !handle) return;

  let isDragging = false;

  const onMouseMove = (e) => {
    if (!isDragging) return;

    const rect = wrapper.getBoundingClientRect();
    let offsetX = e.clientX - rect.left;

    if (offsetX < 0) offsetX = 0;
    if (offsetX > rect.width) offsetX = rect.width;

    const percentage = (offsetX / rect.width) * 100;

    afterContent.style.width = (100 - percentage) + '%';
    handle.style.left = percentage + '%';
  };

  const onMouseUp = () => { isDragging = false; };

  handle.addEventListener('mousedown', () => isDragging = true);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Touch support
  handle.addEventListener('touchstart', () => isDragging = true);
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    onMouseMove(e.touches[0]);
  });
  document.addEventListener('touchend', onMouseUp);
});
