import {
    Request,
    Response,
    NextFunction
} from "express";

export class AuthorizationMiddleware{

    public static authorize(

        ...permissions:string[]

    ){

        return(

            request:Request,

            response:Response,

            next:NextFunction

        ):void=>{

            const user=(

                request as Request&{

                    user?:{

                        permissions?:string[];

                    };

                }

            ).user;

            if(

                !user

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

            const granted=

                user.permissions??

                [];

            const allowed=

                permissions.every(

                    permission=>

                        granted.includes(

                            permission

                        )

                );

            if(

                !allowed

            ){

                response.status(

                    403

                ).json({

                    success:false,

                    message:

                        "You do not have permission to perform this action."

                });

                return;

            }

            next();

        };

    }

}
