function showWish(img, message) {
  // clear all previous wishes
  document.querySelectorAll('.wish-box').forEach(box => box.innerHTML = '');
  
  // show wish below clicked image
  const wishBox = img.nextElementSibling;
  wishBox.innerHTML = `<p>${message}</p>`;
}
