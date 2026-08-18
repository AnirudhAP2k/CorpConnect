import { scanWithClamAV } from "@/domain/file-uploads/scan";

describe("ClamAV Scanner Module", () => {
    const originalHost = process.env.CLAMAV_HOST;

    afterEach(() => {
        process.env.CLAMAV_HOST = originalHost;
    });

    test("auto-approves when CLAMAV_HOST is not set (graceful degradation)", async () => {
        delete process.env.CLAMAV_HOST;
        const dummyBuffer = Buffer.from("test content");

        const result = await scanWithClamAV(dummyBuffer);

        expect(result.clean).toBe(true);
        expect(result.engine).toBe("none");
        expect(result.verdict).toContain("auto-approved");
    });
});
