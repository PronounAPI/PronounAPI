# pronounapi

An API that allows users of various platforms to set their pronouns (with custom pronoun support), that also maintains compatibility with the original [pronoundb](https://github.com/cyyynthia/pronoundb.org) by cynthia

## Legal stuff


### PronounAPI

License: [Non-Profit Open Software License version 3.0](https://spdx.org/licenses/NPOSL-3.0.html).

### PronounDB

Source code link: https://github.com/cyyynthia/pronoundb.org <br>
License: [BSD 3-Clause "New" or "Revised" License](https://spdx.org/licenses/BSD-3-Clause.html) <br>
Copyright: 2020-2022 Cynthia K. Rey, All rights reserved.

No code from the original PronounDB was used in the making of PronounAPI.

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
