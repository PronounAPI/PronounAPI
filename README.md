# pronoundb-custom

## Error code meanings

| Error code | Meaning                                       | Example                                                 |
| ---------- | --------------------------------------------- | ------------------------------------------------------- |
| 1          | Data validation error                         | Not providing a platform for GET /api/v1/lookup         |
| 2          | External oauth error                          | Invalid code given to oauth callbacks                   |
| 3          | Invalid or missing authorization              | Not giving Authorization header for authorized requests |
| 4          | Ratelimited                                   | Creating pronouns too fast                              |
| 5          | Unknown internal error (should be impossible) | Should be impossible                                    |
| 6          | Max limit reached                             | Trying to make more than 10 pronouns                    |
| 7          | Invalid data given                            | Invalid pronoun ID in PATCH /api/v1/users               |
| 8          | Forbidden                                     | Trying to delete someone else's pronoun                 |
| 9          | Action not possible                           | Deleting a pronoun that is currently being used         |