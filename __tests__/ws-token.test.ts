/** @jest-environment node */

import { auth } from "@/auth";
import { SignJWT } from "jose";
import { POST } from "@/app/api/messaging/ws-token/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));

jest.mock("jose", () => ({
	SignJWT: jest.fn().mockImplementation(() => {
		const jwt = {
			setProtectedHeader: jest.fn(),
			setSubject: jest.fn(),
			setIssuer: jest.fn(),
			setAudience: jest.fn(),
			setIssuedAt: jest.fn(),
			setExpirationTime: jest.fn(),
			sign: jest.fn().mockResolvedValue("signed-ws-token"),
		};
		Object.values(jwt).forEach((method) => {
			if (method !== jwt.sign) method.mockReturnValue(jwt);
		});
		return jwt;
	}),
}));

const originalSecret = process.env.WS_SERVICE_AUTH_SECRET;

describe("WebSocket token endpoint", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.WS_SERVICE_AUTH_SECRET = "dedicated-ws-secret";
	});

	afterAll(() => {
		if (originalSecret === undefined) {
			delete process.env.WS_SERVICE_AUTH_SECRET;
		} else {
			process.env.WS_SERVICE_AUTH_SECRET = originalSecret;
		}
	});

	it("rejects unauthenticated callers", async () => {
		(auth as jest.Mock).mockResolvedValue(null);

		const response = await POST();

		expect(response.status).toBe(401);
		expect(SignJWT).not.toHaveBeenCalled();
	});

	it("requires an active organization", async () => {
		(auth as jest.Mock).mockResolvedValue({
			user: { id: "user-1", activeOrganizationId: null },
		});

		const response = await POST();

		expect(response.status).toBe(403);
	});

	it("fails closed when the dedicated secret is missing", async () => {
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
		delete process.env.WS_SERVICE_AUTH_SECRET;
		(auth as jest.Mock).mockResolvedValue({
			user: { id: "user-1", activeOrganizationId: "org-1" },
		});

        const response = await POST();

		expect(response.status).toBe(503);
        consoleError.mockRestore();
	});

	it("mints an audience-scoped, non-cacheable token", async () => {
		(auth as jest.Mock).mockResolvedValue({
			user: { id: "user-1", activeOrganizationId: "org-1" },
		});

		const response = await POST();
		const body = await response.json();
		const jwt = (SignJWT as unknown as jest.Mock).mock.results[0].value;

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(body).toEqual({
			token: "signed-ws-token",
			expiresInSeconds: 300,
		});
		expect(SignJWT).toHaveBeenCalledWith({
			userId: "user-1",
			activeOrgId: "org-1",
		});
		expect(jwt.setSubject).toHaveBeenCalledWith("user-1");
		expect(jwt.setIssuer).toHaveBeenCalledWith("evently-next");
		expect(jwt.setAudience).toHaveBeenCalledWith("evently-ws");
		expect(jwt.setExpirationTime).toHaveBeenCalledWith("300s");
	});
});
