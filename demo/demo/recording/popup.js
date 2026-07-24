// records which button was actually clicked into localStorage (survives this window closing
// and a fresh popup reopening on the same origin/partition during replay, unlike sessionStorage)
document.addEventListener(`click`, e => {
	if (e.target && e.target.id) {
		localStorage.setItem(`__lastClick`, e.target.id);
		localStorage.setItem(`__clickCount`, String((Number(localStorage.getItem(`__clickCount`)) || 0) + 1));
	}
});
