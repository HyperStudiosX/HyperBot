import {
    Request,
    Response,
    NextFunction
} from "express";

import jwt from "jsonwebtoken";

export class AuthenticationMiddleware{

    public static authenticate(

        request:Request,

        response:Response,

        next:NextFunction

    ):void{

        const header=

            request.headers.authorization;

        if(

            !header||

            !header.startsWith(

                "Bearer "

            )

        ){

            response.status(

                401

            ).json({

                success:false,

                message:

                    "Authentication required."

            });

            return;

        }

        const token=

            header.substring(

                7

            );

        try{

            const payload=

                jwt.verify(

                    token,

                    process.env.JWT_SECRET||

                    "development"

                );

            (

                request as Request&{

                    user?:unknown

                }

            ).user=

                payload;

            next();

        }

        catch{

            response.status(

                401

            ).json({

                success:false,

                message:

                    "Invalid or expired token."

            });

        }

    }

}
