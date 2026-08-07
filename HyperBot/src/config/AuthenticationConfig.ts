export interface AuthenticationConfig{

    /* --------------------------------------------------------
     * Authentication
     * -------------------------------------------------------- */

    enabled:boolean;

    provider:

        "discord"|

        "local"|

        "oauth2";

    /* --------------------------------------------------------
     * JWT
     * -------------------------------------------------------- */

    jwtSecret:string;

    jwtIssuer:string;

    jwtAudience:string;

    jwtExpiresIn:string;

    /* --------------------------------------------------------
     * Sessions
     * -------------------------------------------------------- */

    sessionEnabled:boolean;

    sessionTimeout:number;

    refreshTokenEnabled:boolean;

    refreshTokenExpiresIn:string;

    /* --------------------------------------------------------
     * Passwords
     * -------------------------------------------------------- */

    bcryptRounds:number;

    minimumPasswordLength:number;

    requireStrongPasswords:boolean;

    /* --------------------------------------------------------
     * Security
     * -------------------------------------------------------- */

    maxLoginAttempts:number;

    lockoutDuration:number;

    twoFactorAuthentication:boolean;

    ipValidation:boolean;

}
