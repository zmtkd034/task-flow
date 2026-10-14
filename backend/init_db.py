"""Task Flow 테이블을 만든다. 실행: python -m backend.init_db

이미 있는 테이블은 그대로 두며, 기존 데이터를 지우거나 초기화하지 않는다.
T16: users·sessions 테이블을 만들고, 기존 tasks에 user_id 열이 없으면 추가한다(ALTER TABLE ADD COLUMN, DROP 없음).
"""

from sqlalchemy import inspect, text

from backend.database import Base, engine
from backend.models import SessionRow, TaskRow, UserRow

# 기존 tasks 행은 지우지 않고 user_id를 NULL(주인 없음)로 둔다. 열·인덱스·외래 키를 한 문장으로 추가한다.
ADD_TASKS_USER_ID = text(
    "ALTER TABLE tasks"
    " ADD COLUMN user_id INT NULL AFTER id,"
    " ADD INDEX ix_tasks_user_id (user_id),"
    " ADD CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES users (id)"
)


def main() -> None:
    table_names = [UserRow.__tablename__, SessionRow.__tablename__, TaskRow.__tablename__]
    existed = {name: inspect(engine).has_table(name) for name in table_names}
    # create_all은 없는 테이블만 만든다(CREATE TABLE만 실행, DROP 없음).
    Base.metadata.create_all(engine)
    for name in table_names:
        if existed[name]:
            print(f"'{name}' 테이블이 이미 있어 그대로 두었습니다.")
        else:
            print(f"'{name}' 테이블을 만들었습니다.")

    columns = {column["name"] for column in inspect(engine).get_columns(TaskRow.__tablename__)}
    if "user_id" in columns:
        print("'tasks.user_id' 열이 이미 있어 그대로 두었습니다.")
    else:
        with engine.begin() as connection:
            connection.execute(ADD_TASKS_USER_ID)
        print("'tasks.user_id' 열을 추가했습니다. 기존 할 일은 주인 없음(NULL)으로 남습니다.")


if __name__ == "__main__":
    main()
