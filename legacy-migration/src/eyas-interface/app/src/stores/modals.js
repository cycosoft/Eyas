import { defineStore } from 'pinia';

export default defineStore(`modals`, {
	state: () => ({
		visible: []
	}),

	actions: {
		track(id) {
			this.visible.push(id);
		},

		untrack(id) {
			// get the index of the id
			const index = this.visible.indexOf(id);

			// if id is in the list
			if (index > -1) {
				// remove the id from the list
				this.visible.splice(index, 1);
			}
		}
	},

	getters: {
		lastOpenedById() {
			return this.visible.at(-1);
		}
	}
});