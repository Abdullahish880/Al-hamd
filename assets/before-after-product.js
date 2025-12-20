(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var wrapper = document.querySelector('.before-after-wrapper');
    if (!wrapper) return;

    var beforeContent = wrapper.querySelector('.before-content');
    var afterContent = wrapper.querySelector('.after-content');
    var handle = wrapper.querySelector('.before-after-handle');

    if (!beforeContent || !afterContent || !handle) return;

    var isDragging = false;

    function moveHandle(x) {
      var rect = wrapper.getBoundingClientRect();
      var offsetX = x - rect.left;

      if (offsetX < 0) offsetX = 0;
      if (offsetX > rect.width) offsetX = rect.width;

      var percentage = (offsetX / rect.width) * 100;

      // Smooth animation via transition already in CSS
      beforeContent.style.width = percentage + '%';
      afterContent.style.width = (100 - percentage) + '%';
      handle.style.left = percentage + '%';
    }

    // Mouse events
    handle.addEventListener('mousedown', function() { isDragging = true; });
    document.addEventListener('mousemove', function(e) { if (isDragging) moveHandle(e.clientX); });
    document.addEventListener('mouseup', function() { isDragging = false; });

    // Touch events
    handle.addEventListener('touchstart', function() { isDragging = true; });
    document.addEventListener('touchmove', function(e) { 
      if (isDragging) moveHandle(e.touches[0].clientX); 
    });
    document.addEventListener('touchend', function() { isDragging = false; });
  });
})();
