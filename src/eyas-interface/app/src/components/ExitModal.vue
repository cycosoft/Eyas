<template>
    <div class="app-exit">
        <div class="modal">
            <div class="content">
                Would you like to exit the test?
            </div>

            <div class="actions">
                <button @click="cancel">Cancel</button>
                <button class="primary" @click="exit">Exit</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            message: `Hello Vue!`
        }
    },

    methods: {
        exit() {
            console.log(`exit()`);
        },

        cancel() {
            console.log(`cancel()`);
        }
    }
};
</script>