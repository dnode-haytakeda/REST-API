import { useNavigate } from "react-router-dom";

const SelectRole = () => {
    const navigate = useNavigate();

    return ( 
        <div className="role-select-page">
            <h1>ご利用方法を選択してください</h1>
            <div className="role-select-actions">
                <button className="btn btn-primary" onClick={() => navigate("/mypage/login")}>
                    ユーザーとして利用
                </button>
                <button className="btn btn-outline" onClick={() => navigate("/admin/login")}>
                    管理者としてログイン
                </button>
            </div>
        </div>
    )
}

export default SelectRole;