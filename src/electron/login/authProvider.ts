import { AuthenticationResult, InteractionRequiredAuthError, PublicClientApplication, SilentFlowRequest } from '@azure/msal-node';
import { shell } from 'electron';
import { policeResetPassword } from './config';

export class AuthProvider {
    private msalConfig;
    private clientApplication : PublicClientApplication;
    account;
    cache;
    private successTemplate: string;

    constructor(msalConfig, successTemplate = '') {
        this.msalConfig = msalConfig;
        this.clientApplication = new PublicClientApplication(this.msalConfig);
        this.cache = this.clientApplication.getTokenCache();
        this.account = null;
        this.successTemplate = successTemplate;
    }

    public setSuccessTemplate(template: string) {
        this.successTemplate = template;
    }

    async login() {
        const tokenRequest: SilentFlowRequest = {
            scopes: [],
            account: null,
        };
        const authResponse = await this.getToken(tokenRequest);
        return this.handleResponse(authResponse);
    }

    async logout() {
        if (!this.account) return;
        try {
            await shell.openExternal(`${this.msalConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${this.msalConfig.auth.postLogoutRedirectUri}`);
            await this.cache.removeAccount(this.account);
            this.account = null;
        } catch (error) {
            console.log(error);
        }
    }

    async getToken(
        tokenRequest: SilentFlowRequest
    ): Promise<AuthenticationResult> {
        try {
            let authResponse: AuthenticationResult;
            const account = this.account || (await this.getAccount());
            if (account) {
                tokenRequest.account = account;
                authResponse = await this.getTokenSilent(tokenRequest);
            } else {
                authResponse = await this.getTokenInteractive(tokenRequest);
            }
            this.account = authResponse.account;
            return authResponse;
        } catch (error) {
            throw error;
        }
    }

    async getTokenSilent(
        tokenRequest: SilentFlowRequest
    ): Promise<AuthenticationResult> {
        try {
            return await this.clientApplication.acquireTokenSilent(tokenRequest);
        } catch (error) {
            console.log("Silent token acquisition failed, acquiring token using pop up");
            return await this.getTokenInteractive(tokenRequest);
        }
    }

    async getTokenInteractive(tokenRequest) {
        try {
            const openBrowser = async (url) => {
                console.log(url)
                await shell.openExternal(url);
            };

            const authResponse = await this.clientApplication.acquireTokenInteractive({
                ...tokenRequest,
                openBrowser,
                redirectUri: this.msalConfig.auth.redirectUri,
                successTemplate: this.successTemplate,
            });

            return authResponse;
        } catch (error) {
            if (error.errorMessage && error.errorMessage.includes('AADB2C90118')) {
                // User clicked "Forgot Password"
                return await this.passwordReset();
            }
            throw error;
        }
    }

    async passwordReset() {
        const passwordResetRequest = {
            scopes: [],
            authority: policeResetPassword.resetPassword.authority,
            redirectUri: this.msalConfig.auth.redirectUri,
            openBrowser: async (url) => {
                console.log("Password reset URL --- ", url);
                await shell.openExternal(url);
            },
        };
        const authResponse = await this.clientApplication.acquireTokenInteractive(passwordResetRequest);
        return authResponse;
    }

    
    /**
     * Handles the response from a popup or redirect. If response is null, will check if we have any accounts and attempt to sign in.
     * @param response
     */
    async handleResponse(response) {
        if (response !== null) {
            this.account = response.account;
        } else {
            this.account = await this.getAccount();
        }

        return this.account;
    }

    /**
     * Calls getAllAccounts and determines the correct account to sign into, currently defaults to first account found in cache.
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */
    async getAccount() {
        const currentAccounts = await this.clientApplication.getAllAccounts();

        if (!currentAccounts) {
            console.log('No accounts detected');
            return null;
        }

        if (currentAccounts.length > 1) {
            // Add choose account code here
            console.log('Multiple accounts detected, need to add choose account code.');
            return currentAccounts[0];
        } else if (currentAccounts.length === 1) {
            return currentAccounts[0];
        } else {
            return null;
        }
    }
}
