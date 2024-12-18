import { Stream } from "../../types/stream";
import { User } from "../../types/user"

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID as string;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET as string;
const TWITCH_CHANNEL_ID = process.env.TWITCH_CHANNEL_ID as string;

export abstract class TwitchAPIII {
	
  private static twitchAPIEndpoint = 'https://api.twitch.tv/helix'
  private static twitchAPIUserEndpoint = `${this.twitchAPIEndpoint}/users`
  private static twitchAPIStreamEndpoint = `${this.twitchAPIEndpoint}/streams`

  private static headers: [string, string][] = []

	public static async init(): Promise<void> {

		const twitchAuth = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
			{
				method: "POST",
			});
		
		const twitchAuthToken = (await twitchAuth.json()).access_token;

    this.headers = [
      ['Authorization', `Bearer ${twitchAuthToken}`],
      ['Content-Type', 'application/json'],
      ['Client-ID', TWITCH_CLIENT_ID]
		]
  }
	
	 /**
   * Retrieves data regarding a Twitch user from the Twitch API
   * @param login username of the user to retrieve
   */
	 public static async getUser(login: string): Promise<User | undefined> {
    const url = `${this.twitchAPIUserEndpoint}?login=${login}`
    let user: User | undefined;

		try {
			const response = await fetch(url, { 
				method: "GET",
				headers: this.headers }
			);
	
			const body = await response.json();
			const userData = body.data.length > 1 ? body.data : body.data[0];
			if (userData) {
				user = new User(userData.login, userData.profile_image_url, userData.id, userData.display_name);
			}
		}
		catch (error) {
			console.error(error);
		}

    return user;
  }

  public static async getStream(streamDate: string): Promise<Stream | undefined> {
    const url = `${this.twitchAPIStreamEndpoint}?user_id=${TWITCH_CHANNEL_ID}&first=1`

    let stream: Stream | undefined;

		try {
			const response = await fetch(url, { 
				method: "GET",
				headers: this.headers }
			);
	
			const body = await response.json();
			const streamData = body.data.length > 1 ? body.data : body.data[0];
			if (streamData) {
				stream = new Stream(streamData.id, streamDate);
			}
		}
		catch (error) {
			console.error(error);
		}

		return stream
  }
}

type TwitchAPIMethod = 'GET_VIP' | 'DELETE_VIP' | 'GET_SUBSCRIPTIONS' | 'GET_USER';
type TwitchAPI_GetVipsResponse = {
	user_id: string;
	user_login: string;
	user_name: string;
}

export abstract class TwitchAPI {
	private static twitchAPIAuthEndpoint =
		'https://id.twitch.tv/oauth2/token';
	private static twitchAPIEndpoint = 'https://api.twitch.tv/helix';
	private static redirectUri: string | null = null;
	private static headers: [string, string][] = [];
	private static initHeaders: [string, string][] = [];
	private static accessToken: string | null = null;
	private static refreshToken: string | null = null;
	private static authHeaders = {
		'Content-Type': 'application/x-www-form-urlencoded',
		Authorization: `Basic ${btoa(
			`${TWITCH_CLIENT_ID}:${TWITCH_CLIENT_SECRET}`
		)}`,
		'Client-ID': TWITCH_CLIENT_ID,
	};

	public static async init(): Promise<void> {

		const twitchAuth = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
			{
				method: "POST",
			});
		
		const twitchAuthToken = (await twitchAuth.json()).access_token;

    this.initHeaders = [
      ['Authorization', `Bearer ${twitchAuthToken}`],
      ['Content-Type', 'application/json'],
      ['Client-ID', TWITCH_CLIENT_ID]
		]
  }

	public static isAuthenticated = () => this.accessToken !== null;

	public static getAuthorizationUrl(host: string, port: number): void {
		this.redirectUri = `http://${host}:${port}/webhooks/twitch`;

		const clientId = TWITCH_CLIENT_ID;
		const redirectUri = encodeURIComponent(this.redirectUri);
		const scope = encodeURIComponent('channel:manage:vips channel:read:subscriptions channel:read:redemptions');
		const twitchCallbackUri = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

		console.log(this.redirectUri);
		console.log(`Authenticate with the Twitch API: ${twitchCallbackUri}`);
	}

	public static async exchangeAuthorizationCode(code: string): Promise<void> {

		const response = await fetch(this.twitchAPIAuthEndpoint, {
			method: 'POST',
			headers: this.authHeaders,
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code: code,
				redirect_uri: this.redirectUri!,
			}).toString(),
		});

		if (!response.ok) {
			console.log(
				`Twitch API returned a ${response.status} ${response.statusText} status when exchanging code.`
			);
			return;
		}

		const authData = await response.json();
		this.accessToken = authData.access_token;
		this.refreshToken = authData.refresh_token;
		this.headers = [
			['Authorization', `Bearer ${this.accessToken}`],
			['Content-Type', 'application/json'],
			['Client-ID', TWITCH_CLIENT_ID],
		];

		console.log('Successfully authenticated with Twitch API.');
	}

	private static async refreshAccessToken(): Promise<void> {
		const response = await fetch(this.twitchAPIAuthEndpoint, {
			method: 'POST',
			headers: this.authHeaders,
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: this.refreshToken!,
			}).toString(),
		});

		const authData = await response.json();
		this.accessToken = authData.access_token;
		this.headers[0] = ['Authorization', `Bearer ${this.accessToken}`];
	}

	public static async getUser(username: string): Promise<any> {
		return this.makeRequest(
			'GET_USER',
			`${this.twitchAPIEndpoint}/users?login=${username}`
		);
	}

	public static async getVIPs(): Promise<TwitchAPI_GetVipsResponse | undefined> {
		if (!this.isAuthenticated()) {
			return undefined;
		}
		return this.makeRequest(
			'GET_VIP',
			`${this.twitchAPIEndpoint}/channels/vips?broadcaster_id=${TWITCH_CHANNEL_ID}`
		);
	}

	public static async deleteVIP(username: string): Promise<null | undefined> { 
		if (!this.isAuthenticated()) {
			return undefined;
		}
		const user_id = await this.getUser(username);
		return this.makeRequest(
			'DELETE_VIP',
			`${this.twitchAPIEndpoint}/channels/vips?user_id=${user_id}&broadcaster_id=${TWITCH_CHANNEL_ID}`
		);
	}

	private static async makeRequest(
		payload: TwitchAPIMethod,
		url: string,
		retryCount: number = 0
	): Promise<any> {
		const response = await fetch(url, {
			method: payload === 'DELETE_VIP' ? 'DELETE' : 'GET',
			headers: this.headers,
		});

		if (response.status === 401 && retryCount < 2) {
			await this.refreshAccessToken();
			return this.makeRequest(payload, url, retryCount + 1);
		}

		if (response.status === 401) {
			console.log('Failed to refresh access token after multiple attempts.');
		}

		if (response.status === 404) {
			console.log(`Url: ${url} returned a 404`);
		}

		if (response.status === 400) {
			console.log(`Url: ${url} returned a 400`);
		}

		if (response.ok) {
			const body = await response.json();
			switch (payload) {
				default:
					return body;
			}
		}

		return undefined;
	}
}
