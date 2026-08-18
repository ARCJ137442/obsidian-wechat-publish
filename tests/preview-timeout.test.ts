import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearPreviewTimeout,
	renewPreviewTimeout,
} from "../src/preview-timeout";

describe("预览服务器空闲超时", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("续期后从新的请求时间重新计时", () => {
		vi.useFakeTimers();
		const onExpire = vi.fn();
		let timer = renewPreviewTimeout(null, onExpire, 30_000);

		vi.advanceTimersByTime(29_000);
		timer = renewPreviewTimeout(timer, onExpire, 30_000);
		vi.advanceTimersByTime(29_000);
		expect(onExpire).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1_000);
		expect(onExpire).toHaveBeenCalledOnce();
	});

	it("清理时取消尚未到期的关闭任务", () => {
		vi.useFakeTimers();
		const onExpire = vi.fn();
		const timer = renewPreviewTimeout(null, onExpire, 30_000);

		clearPreviewTimeout(timer);
		vi.advanceTimersByTime(30_000);

		expect(onExpire).not.toHaveBeenCalled();
	});
});
