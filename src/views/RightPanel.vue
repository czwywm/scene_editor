<template>
	<div class="right"></div>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue'
</script>
<style lang="less" scoped>
.right {
	width: 280px;
	height: calc(100% - 50px);
	background-color: #181818;
	position: fixed;
	top: 50px;
	right: 0;
	z-index: 100;
	display: flex;
}
</style>
