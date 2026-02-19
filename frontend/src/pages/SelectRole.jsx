import { useNavigate } from "react-router-dom";

const SelectRole = () => {
    const navigate = useNavigate();

    return ( 
        <div className="role-select-page">
            <h1>どちらで利用しますか？</h1>
            <div className="role-select-actions">
                <button className="btn btn-primary" onClick={() => navigate("/mypage")}>
                    エンドユーザー
                </button>
                <button className="btn btn-primary" onClick={() => navigate("/admin")}>
                    管理者
                </button>
            </div>
        </div>
    )
}

export default SelectRole;