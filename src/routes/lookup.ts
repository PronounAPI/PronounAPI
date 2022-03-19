import { Route, RouteOptions } from '@tyman/modulo';
import { Request, Response } from 'express';

@RouteOptions({
    path: '/api/v1/lookup',
    spec: {
        get: {
            description: 'Lookup a user from the database. Will fallback to pronoundb compatibility if the specified user is not found',
            responses: {
                '200': {
                    description: 'The found user data',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The user\'s pronouns',
                                properties: {
                                    userId: {
                                        type: 'string',
                                        description: 'The ID of the fetched user'
                                    },
                                    platform: {
                                        enum: [
                                            'discord',
                                            'facebook',
                                            'github',
                                            'twitch',
                                            'twitter'
                                        ],
                                        description: 'The platform used to find this user'
                                    },
                                    preferredPronoun: {
                                        $ref: '#/components/schemas/Pronoun'
                                    },
                                    extraPronouns: {
                                        type: "array",
                                        description: "An array of extra pronouns that this user has set",
                                        items: {
                                            $ref: "#/components/schemas/Pronoun"
                                        }
                                    },
                                    pronoundbCompat: {
                                        type: 'boolean',
                                        default: 'Whether or not this pronoun was fetched from pronoundb because it was not stored in the normal database.',
                                        example: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
})
export default class LookupRoute extends Route {
    async get(req: Request, res: Response) {
        
    }
}