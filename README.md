# JH03-main



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/ee/gitlab-basics/add-file.html#add-a-file-using-the-command-line) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://stgit.dcs.gla.ac.uk/team-project-h/2025/jh03/jh03-main.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://stgit.dcs.gla.ac.uk/team-project-h/2025/jh03/jh03-main/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/ee/user/project/merge_requests/merge_when_pipeline_succeeds.html)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/index.html)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.


## Team Edit to README, not from the original file
Did not want to delete the above as it contains useful information. 

## Summary of changes
The project now runs as two Docker services: one for the React front end and one for the Django API. Django now bootstraps its own local PostgreSQL instance inside the same container (data files live under `services/django/lithium/.postgres-data`, which is ignored from git) and automatically runs `makemigrations` + `migrate` every time the container starts so model changes immediately reach the database.

To work with the codebase:

1. Clone the repo and switch to the desired branch.
2. Start both containers with `make up` (builds images and launches dev services defined in `ops/compose/docker-compose.dev.yml`).
3. Frontend code lives in `services/frontend/app/src`; frontend tests stay under `services/frontend/app/tests/frontend`.
4. The Django project (including models, views, and tests) lives in `services/django/lithium`.
5. Dev servers run inside their containers. Use `docker compose -f ops/compose/docker-compose.dev.yml logs -f frontend` (or `django`) to view output. The Django logs now include messages from the embedded PostgreSQL startup.
6. Before pushing, run project tests inside the appropriate container (for example `docker compose -f ops/compose/docker-compose.dev.yml exec frontend npm test` or `... exec django python manage.py test`).
7. Commit and push your changes. CI will build the images on GitLab so the team stays in sync.

## Development workflow

### 1. First-time setup or post-clone refresh

- From the repository root, run `./prepare-environment`.
- The script writes your UID/GID to `ops/compose/.env`, prepares writable host folders under `.docker/node_modules`, rebuilds both images, launches the dev stack, installs dependencies, and runs the frontend/Django test suites inside their containers.

### 2. Ongoing development cycle

- Use `./refresh-environment` whenever you want to stop running containers, rebuild, start fresh, reinstall dependencies, and execute both test suites.
- Follow logs with `docker compose -f ops/compose/docker-compose.dev.yml logs -f`.

### Resetting the embedded database

- Run `make reset-django-db` to stop the Django container, delete `services/django/lithium/.postgres-data`, and restart it with a brand-new PostgreSQL cluster. All application data will be lost, so only run this when you intentionally want a clean slate.

### Running migrations

- Run `make migrate` to execute `manage.py makemigrations` and `manage.py migrate` inside the Django container. This is handy when you want to generate/inspect migration files without restarting the entire stack (the `make up` path already runs them automatically on startup).

### 3. Adding new services

- Update `ops/scripts/dev-refresh.sh` to include the new service name in `SERVICE_LIST`.
- Ensure the compose file mounts any service-specific dependency folders (for example `.docker/node_modules/<service>` for Node services) and that the service image runs as the `${HOST_UID}:${HOST_GID}` user.

### 4. Continuous integration

- GitLab CI builds every service image with Kaniko and runs both the frontend and Django test jobs. Make sure Node services keep an up-to-date `package-lock.json` so that `npm ci` remains deterministic in CI.

### 5. Troubleshooting

- If `prepare-environment` complains about Docker, verify that Docker Desktop/Engine is running and that the Compose v2 plugin is available.
- To regenerate lockfiles, run `npm install` inside the host directory (not the container), commit the resulting `package-lock.json`, then re-run `./refresh-environment`.
