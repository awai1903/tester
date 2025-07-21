<script>
  const wishes = [
    "🎉 Happy Birthday, shining star! 💜",
    "Wishing you a magical day filled with joy and love.",
    "May your dreams sparkle like your smile!",
    "You are more beautiful than any BTS melody 🎶",
    "Taehyung is proud of you today 💜",
    "Sending purple vibes for your happiest birthday!",
    "You light up the world just like BTS lights up the stage!",
  ];

  function showWish(memberEl, index) {
    const allWishes = document.querySelectorAll('.wish');
    allWishes.forEach(w => w.style.display = 'none'); // Hide all previous

    const wishBox = memberEl.querySelector('.wish');
    wishBox.innerText = wishes[index % wishes.length];
    wishBox.style.display = 'block';
  }
</script>
