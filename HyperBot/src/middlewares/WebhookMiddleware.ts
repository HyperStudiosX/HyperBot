import {
    Request,
    Response,
    NextFunction
} from "express";

import crypto from "crypto";

export class WebhookMiddleware{

    public static verifySignature(

        secret:string

    ){

        return(

            request:Request,

            response:Response,

            next:NextFunction

        ):void=>{

            const signature=

                request.headers[
                    "x-signature"
                ] as string;

            if(

                !signature

            ){

                response.status(

                    401

                ).json({

                    success:false,

                    message:

                        "Missing webhook signature."

                });

                return;

            }

            const payload=

                JSON.stringify(

                    request.body

                );

            const expected=

                crypto

                    .createHmac(

                        "sha256",

                        secret

                    )

                    .update(

                        payload

                    )

                    .digest(

                        "hex"

                    );

            if(

                signature!==

                expected

            ){

                response.status(

                    401

                ).json({

                    success:false,

                    message:

                        "Invalid webhook signature."

                });

                return;

            }

            next();

        };

    }

}
