// Deep links reveal only the requested public chapter summaries, never a book.
function revealChapter() {
  if(!/^#chapters-(secure|assure|soar)$/.test(location.hash))return;
  const target=document.getElementById(location.hash.slice(1));
  if(target){target.open=true;target.scrollIntoView({block:'start'});}
}
revealChapter();
window.addEventListener('hashchange',revealChapter);
